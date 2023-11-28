use std::{
    fs, io,
    path::{self},
    process::{self, Output},
    rc::Rc,
    sync::{Arc, Mutex},
};

use log::debug;

pub struct DockerImage {
    image_name: String,
}

pub struct DockerContainer {
    container_name: String,
    docker_image: Rc<DockerImage>,
}

impl DockerImage {
    pub fn build(context_path: &path::Path) -> Result<DockerImage, DockerError> {
        //todo randomize
        let result = run_cmd(format!("docker build --quiet {:?}", context_path)).map_err(|x| {
            DockerError::UnexpectedError {
                error: format!("Docker build error: {}", x),
            }
        })?;

        if result.status.success() {
            Ok(DockerImage {
                image_name: parse_sha256(parse_output(&result.stdout))
                    .map_err(|err| DockerError::UnexpectedError { error: err })?,
            })
        } else {
            Err(DockerError::UnsuccessfulCommand {
                stderr: parse_output(&result.stdout) + &parse_output(&result.stderr),
            })
        }
    }

    pub fn run(self) -> Result<DockerContainer, DockerError> {
        let docker_run_cmd = format!("docker run -d -m 1GB --quiet {}", self.image_name);
        debug!("Running docker container with command {}", docker_run_cmd);
        let result = run_cmd(docker_run_cmd).map_err(|x| DockerError::UnexpectedError {
            error: format!("Docker run error: {}", x),
        })?;

        if result.status.success() {
            Ok(DockerContainer {
                container_name: parse_sha256(parse_output(&result.stdout))
                    .map_err(|err| DockerError::UnexpectedError { error: err })?,
                docker_image: Rc::new(self),
            })
        } else {
            Err(DockerError::UnsuccessfulCommand {
                stderr: parse_output(&result.stdout) + &parse_output(&result.stderr),
            })
        }
    }
}

impl DockerContainer {
    pub fn exec(
        &self,
        command: String,
        stdin_file: &path::Path,
        stdout_file: &path::Path,
    ) -> Result<(), DockerError> {
        let exec_cmd = format!(
            "docker exec -i {} {} < {:?} > {:?} ",
            self.container_name, command, stdin_file, stdout_file
        );

        debug!("Executing Docker command: {}", exec_cmd);
        let result = run_cmd(exec_cmd).map_err(|x| DockerError::UnexpectedError {
            error: format!("Docker exec error: {}", x),
        })?;

        if result.status.success() {
            Ok(())
        } else {
            Err(DockerError::UnsuccessfulCommand {
                stderr: format!(
                    "Docker exec failed: {}",
                    parse_output(&result.stdout) + &parse_output(&result.stderr)
                ),
            })
        }
    }
}

impl Drop for DockerContainer {
    fn drop(&mut self) {
        let kill_cmd = format!("docker kill {}", self.container_name);
        debug!("Dropping DockerContainer: {}", kill_cmd);
        let result = run_cmd(kill_cmd)
            .expect(format!("Couldn't kill container {}", self.container_name).as_str());

        if !result.status.success() {
            debug!("Dropping DockerContainer: Killing the Docker container was unsuccesful")
        }

        let rm_cmd = format!("docker rm {}", self.container_name);
        debug!("Dropping DockerContainer: {}", rm_cmd);

        let result = run_cmd(rm_cmd).expect("Couldn't remove container");

        if !result.status.success() {
            debug!("Dropping DockerContainer: Removing the Docker container was unsuccesful")
        }
    }
}

impl Drop for DockerImage {
    fn drop(&mut self) {
        let rm_image = format!("docker image rm {}", self.image_name);

        debug!("Dropping DockerImage: {}", rm_image);

        let result =
            run_cmd(rm_image).expect(format!("Couldn't remove image {}", self.image_name).as_str());

        if !result.status.success() {
            debug!("Dropping DockerImage: Removing Docker image was unsuccesful")
        }
    }
}

pub enum DockerError {
    UnsuccessfulCommand { stderr: String },
    UnexpectedError { error: String },
}

impl DockerError {
    pub fn to_string(self) -> String {
        match self {
            DockerError::UnsuccessfulCommand { stderr } => {
                format!("Docker command was unsuccessful: {}", stderr)
            }
            DockerError::UnexpectedError { error } => error,
        }
    }
}

fn run_cmd(command: String) -> io::Result<Output> {
    if cfg!(target_os = "windows") {
        process::Command::new("cmd").arg("/C").arg(command).output()
    } else {
        process::Command::new("sh").arg("-c").arg(command).output()
    }
}

fn parse_output(output: &[u8]) -> String {
    std::str::from_utf8(&output)
        .expect("Expected to be able to parse command line output")
        .trim()
        .to_string()
}

fn parse_sha256(value: String) -> Result<String, String> {
    let prefix = "sha256:";

    if value.len() != 64 && value.len() != 64 + prefix.len() {
        return Err(format!("Unrecognized SHA value {}", value));
    }

    let skip = if value.starts_with("sha256:") {
        prefix.len()
    } else {
        0
    };

    Ok(value[skip..(skip + 12)].to_string())
}
