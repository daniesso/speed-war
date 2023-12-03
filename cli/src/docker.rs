use std::{
    fs,
    io::{self, BufRead},
    path::{self, Path},
    process::{self, Output, Stdio},
    thread,
    time::{Duration, Instant},
};

use log::debug;
use tempfile::{tempdir_in, TempDir};

pub struct DockerImage {
    image_name: String,
}

pub struct DockerRunResult {
    pub start_timestamp: chrono::DateTime<chrono::Utc>,
    pub end_timestamp: chrono::DateTime<chrono::Utc>,
    pub results_dir: TempDir,
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

    pub fn run(&self, stdin_file: &path::Path) -> Result<DockerRunResult, DockerError> {
        let results_dir = tempdir_in(".").map_err(|_| DockerError::UnexpectedError {
            error: "Could not create a temp directory for test output".to_string(),
        })?;

        let container_name = random_string::generate(12, random_string::charsets::ALPHA_LOWER);
        let docker_run_cmd = format!(
            "docker run \
                --mount type=bind,src={:?},target=/timing/ \
                -i -m 512MB --memory-swap 512MB --name {} {} < {:?} > {:?}",
            results_dir.path(),
            container_name,
            self.image_name,
            stdin_file,
            results_dir.path().join("output.txt")
        );
        debug!("Running docker container with command {}", docker_run_cmd);

        let result = run_cmd(docker_run_cmd, CONTAINER_STARTUP_TIMEOUT).map_err(|x| {
            DockerError::UnexpectedError {
                error: format!("Docker run error: {}", x),
            }
        })?;

        self.delete_docker_container(container_name);

        if result.status.success() {
            let (start_timestamp, end_timestamp) = self
                .parse_timing(&results_dir.path())
                .map_err(|err| DockerError::UnexpectedError { error: err })?;

            Ok(DockerRunResult {
                start_timestamp,
                end_timestamp,
                results_dir,
            })
        } else {
            Err(DockerError::UnsuccessfulCommand {
                stderr: parse_output(&result.stdout) + &parse_output(&result.stderr),
            })
        }
    }

    fn delete_docker_container(&self, container_name: String) {
        let rm_cmd = format!("docker rm {}", container_name);
        debug!("Removing Docker container: {}", rm_cmd);

        let result = run_cmd(rm_cmd, TWENTY_SECONDS).expect("Couldn't remove container");

        if !result.status.success() {
            debug!("Removing Docker container: Removing the Docker container was unsuccesful")
        }
    }

    fn parse_timing(
        &self,
        timing_path: &Path,
    ) -> Result<(chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>), String> {
        let before_path = timing_path.join("before.txt");
        let after_path = timing_path.join("after.txt");

        debug!(
            "Parsing timestamp from files {:?} and {:?}",
            before_path, after_path
        );
        let f1 = fs::File::open(&before_path)
            .map_err(|_| format!("Couldn't open before timestamp file {:?}", before_path))?;
        let f2 = fs::File::open(&after_path)
            .map_err(|_| format!("Couldn't open after timestamp file {:?}", after_path))?;

        let mut reader1 = io::BufReader::new(f1);
        let mut reader2 = io::BufReader::new(f2);

        let mut before_timestamp = String::new();
        reader1
            .read_line(&mut before_timestamp)
            .map_err(|err| format!("Couldn't read before timestamp {}", err))?;

        let mut after_timestamp = String::new();
        reader2
            .read_line(&mut after_timestamp)
            .map_err(|err| format!("Couldn't read before timestamp {}", err))?;

        Ok((
            before_timestamp
                .trim()
                .parse::<chrono::DateTime<chrono::Utc>>()
                .map_err(|err| {
                    format!(
                        "Couldn't parse before timestamp {}: {}",
                        before_timestamp, err
                    )
                })?,
            after_timestamp
                .trim()
                .parse::<chrono::DateTime<chrono::Utc>>()
                .map_err(|err| {
                    format!(
                        "Couldn't parse after timestamp {}: {}",
                        after_timestamp, err
                    )
                })?,
        ))
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

const TWENTY_SECONDS: Duration = Duration::from_secs(20);
