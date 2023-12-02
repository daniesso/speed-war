use std::{
    fs, io,
    path::{self},
    process::{self, Output, Stdio},
    rc::Rc,
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
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
        let build_cmd = format!("docker build --quiet {:?}", context_path);

        debug!("Building docker image using command: {}", build_cmd);
        let result =
            run_cmd(build_cmd, IMAGE_BUILD_TIMEOUT).map_err(|x| DockerError::UnexpectedError {
                error: format!("Docker build error: {}", x),
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
        let docker_run_cmd = format!(
            "docker run -d -m 512MB --memory-swap 512MB --quiet {}",
            self.image_name
        );
        debug!("Running docker container with command {}", docker_run_cmd);
        let result = run_cmd(docker_run_cmd, CONTAINER_STARTUP_TIMEOUT).map_err(|x| {
            DockerError::UnexpectedError {
                error: format!("Docker run error: {}", x),
            }
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
        let result = run_cmd(exec_cmd, CONTAINER_EXEC_TIMEOUT).map_err(|x| {
            DockerError::UnexpectedError {
                error: format!("Docker exec error: {}", x),
            }
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
        let result = run_cmd(kill_cmd, TWENTY_SECONDS)
            .expect(format!("Couldn't kill container {}", self.container_name).as_str());

        if !result.status.success() {
            debug!("Dropping DockerContainer: Killing the Docker container was unsuccesful")
        }

        let rm_cmd = format!("docker rm {}", self.container_name);
        debug!("Dropping DockerContainer: {}", rm_cmd);

        let result = run_cmd(rm_cmd, TWENTY_SECONDS).expect("Couldn't remove container");

        if !result.status.success() {
            debug!("Dropping DockerContainer: Removing the Docker container was unsuccesful")
        }
    }
}

impl Drop for DockerImage {
    fn drop(&mut self) {
        let rm_image = format!("docker image rm {}", self.image_name);

        debug!("Dropping DockerImage: {}", rm_image);

        let result = run_cmd(rm_image, TWENTY_SECONDS)
            .expect(format!("Couldn't remove image {}", self.image_name).as_str());

        if !result.status.success() {
            debug!("Dropping DockerImage: Removing Docker image was unsuccesful")
        }
    }
}

pub enum DockerError {
    UnsuccessfulCommand { stderr: String },
    UnexpectedError { error: String },
    Timeout,
}

impl DockerError {
    pub fn to_string(self) -> String {
        match self {
            DockerError::UnsuccessfulCommand { stderr } => {
                format!("Docker command was unsuccessful: {}", stderr)
            }
            DockerError::UnexpectedError { error } => error,
            DockerError::Timeout => "Timed out".to_string(),
        }
    }
}

fn run_cmd(command: String, timeout: Duration) -> Result<Output, String> {
    let mut child = if cfg!(target_os = "windows") {
        process::Command::new("cmd")
            .arg("/C")
            .arg(command)
            .stdout(Stdio::piped())
            .spawn()
    } else {
        process::Command::new("sh")
            .arg("-c")
            .arg(command)
            .stdout(Stdio::piped())
            .spawn()
    }
    .map_err(|err| format!("Failed to spawn command: {}", err))?;

    let started = Instant::now();

    while started.elapsed() < timeout {
        if let Some(_) = child
            .try_wait()
            .map_err(|err| format!("Failed to check if command had finished: {}", err))?
        {
            return Ok(child.wait_with_output().map_err(|io_error| {
                format!(
                    "IO error occuredd while reading output from command: {}",
                    io_error
                )
            })?);
        }

        thread::sleep(Duration::from_millis(100))
    }

    child
        .kill()
        .map_err(|_| "Timed out and failed to kill process:")?;

    return Err("Timed out".to_string());
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
        return Err(format!("Unrecognized SHA value {:?}", value));
    }

    let skip = if value.starts_with("sha256:") {
        prefix.len()
    } else {
        0
    };

    Ok(value[skip..(skip + 12)].to_string())
}

const IMAGE_BUILD_TIMEOUT: Duration = Duration::from_secs(300);
const CONTAINER_STARTUP_TIMEOUT: Duration = Duration::from_secs(30);
const CONTAINER_EXEC_TIMEOUT: Duration = Duration::from_secs(60);

const TWENTY_SECONDS: Duration = Duration::from_secs(20);
