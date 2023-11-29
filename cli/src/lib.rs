pub mod docker;
pub mod energymonitor;

use clap::ValueEnum;
use docker::{DockerContainer, DockerError, DockerImage};
use energymonitor::{measure_fn, EnergyMonitor};
use log::debug;
use serde::{Deserialize, Serialize};
use std::cmp::max;
use std::io::Read;
use std::rc::Rc;
use std::{env, thread};
use std::{
    fs, io,
    path::{self},
    process,
    sync::{Arc, Mutex},
};
use tempfile::tempdir;
use websocket::{ClientBuilder, OwnedMessage};
pub struct RunResult {
    pub time_elapsed_ms: u32,
    pub energy_consumed_j: u32,
}

#[derive(ValueEnum, Clone, Debug)]
pub enum Lang {
    Rust,
    Python,
}

impl Lang {
    fn base_image(self: &Lang) -> path::PathBuf {
        let base = path::Path::new("base-images");
        match self {
            Lang::Rust => base.join("rust"),
            Lang::Python => base.join("python"),
        }
    }
}

fn copy_dir_all(src: impl AsRef<path::Path>, dst: impl AsRef<path::Path>) -> io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

pub fn run_problem(
    source_code_path: &std::path::PathBuf,
    lang: Lang,
) -> Result<Vec<TestResult>, CLIResponseError> {
    let tmp_dir = prepare_context(source_code_path, lang)
        .map_err(|err| CLIResponseError::InternalError { error: err })?;

    let docker_image = build_docker_image(tmp_dir.path()).map_err(|err| match err {
        DockerError::Timeout => CLIResponseError::BuildTimeout,
        DockerError::UnsuccessfulCommand { stderr } => {
            CLIResponseError::BuildError { error: stderr }
        }
        DockerError::UnexpectedError { error } => CLIResponseError::InternalError { error },
    })?;

    run_tests(docker_image, tmp_dir.path())
        .map_err(|err| CLIResponseError::InternalError { error: err })
}

struct Test {
    test_number: u8,
    input: path::PathBuf,
    solution: path::PathBuf,
    answer: path::PathBuf,
}

fn get_tests(context_directory: &path::Path) -> Result<Vec<Test>, String> {
    let subfolders: Vec<_> = fs::read_dir(context_directory.join("src").join("tests"))
        .map_err(|_| "Could not read contents of tests folder")?
        .map(|entry| {
            let entry = entry.map_err(|_| "Could not read entry")?;
            let ty = entry.file_type().map_err(|_| "Could not read file type")?;

            if ty.is_dir() {
                if let Some(Ok(test_number)) = entry
                    .file_name()
                    .to_str()
                    .map(|file_name| file_name.parse::<u8>())
                {
                    Ok((test_number, entry.path()))
                } else {
                    Err(format!(
                        "Could not parse test number {:?}",
                        entry.file_name()
                    ))
                }
            } else {
                Err(format!(
                    "Expected to find subfolders under tests, but {:?} is a file",
                    entry.path()
                ))
            }
        })
        .collect();

    let (errors, successes): (Vec<_>, Vec<_>) = subfolders.iter().partition(|x| x.is_err());

    if let Some(Err(error)) = errors.iter().next() {
        Err(error.to_string())
    } else {
        Ok(successes
            .iter()
            .map(|test_dir| test_dir.as_ref().expect("Already checked for success"))
            .map(|(test_number, test_path)| Test {
                test_number: *test_number,
                input: test_path.join("input.txt"),
                solution: test_path.join("solution.txt"),
                answer: test_path.join("answer.txt"),
            })
            .collect())
    }
}

fn run_tests(
    docker_image: DockerImage,
    context_directory: &path::Path,
) -> Result<Vec<TestResult>, String> {
    let tests = get_tests(context_directory)?;
    debug!("Running {} tests", tests.len());

    let mut test_results = Vec::new();

    let container = Rc::new(
        docker_image
            .run()
            .map_err(|err| format!("Starting container failed: {}", err.to_string()))?,
    );

    for test in tests {
        let test_run = run_test(container.clone(), &test);
        if let Ok(result) = test_run {
            test_results.push(result);
        } else if let Err(error) = test_run {
            return Err(error);
        }
    }

    Ok(test_results)
}

fn answer_is_equal_to_solution(test: &Test) -> Result<bool, String> {
    debug!("Comparing files {:?} and {:?}", test.answer, test.solution);
    let f1 = fs::File::open(&test.answer).map_err(|_| {
        format!(
            "Couldn't open file {:?} in order to check diff",
            test.answer
        )
    })?;
    let f2 = fs::File::open(&test.solution).map_err(|_| {
        format!(
            "Couldn't open file {:?} in order to check diff",
            test.solution
        )
    })?;

    let mut reader1 = io::BufReader::new(f1);
    let mut reader2 = io::BufReader::new(f2);

    let mut buff1: [u8; 4096] = [0; 4096];
    let mut buff2: [u8; 4096] = [0; 4096];

    let mut page = 0;
    loop {
        let num_bytes_read1 = reader1
            .read(&mut buff1)
            .expect("Unexpected read failure (buff1)");
        let num_bytes_read2 = reader2
            .read(&mut buff2)
            .expect("Unexpected read failure (buff2)");

        let debug_log_diff = || {
            debug!(
                "Bytes {}-{} are not equal.\nAnswer={:?}\nSolution={:?}",
                page * 4096,
                page * 4096 + max(num_bytes_read1, num_bytes_read2),
                std::str::from_utf8(&buff1[0..num_bytes_read1])
                    .expect("Expected to be able to parse buffer data as utf8"),
                std::str::from_utf8(&buff2[0..num_bytes_read2])
                    .expect("Expected to be able to parse buffer data as utf8")
            );
        };

        if num_bytes_read1 == 0 && num_bytes_read2 == 0 {
            return Ok(true);
        } else if num_bytes_read1 != num_bytes_read2 {
            debug_log_diff();
            return Ok(false);
        } else {
            for idx in 0..num_bytes_read1 {
                if buff1[idx] != buff2[idx] {
                    debug_log_diff();
                    return Ok(false);
                }
            }
        }

        page += 1;
    }
}

fn compare_answer(test: &Test) -> Result<bool, String> {
    answer_is_equal_to_solution(test)
}

#[derive(Serialize)]
pub struct TestStats {
    time_elapsed_ms: u32,
    energy_consumed_j: Option<f64>,
}

#[derive(Serialize)]
pub enum TestRunResult {
    TestError { error: String },
    Incorrect,
    Correct { stats: TestStats },
}

#[derive(Serialize)]
pub struct TestResult {
    pub test_number: u8,
    pub run_result: TestRunResult,
}

#[derive(Serialize, Debug)]
pub enum CLIResponseError {
    BuildError { error: String },
    BuildTimeout,
    InternalError { error: String },
}

fn run_test(container: Rc<DockerContainer>, test: &Test) -> Result<TestResult, String> {
    let ws_url = env::var("ENERGY_MONITOR_WS_URL").ok();

    let (result, measurement) = measure_fn(ws_url, &|| {
        container.exec("sh -c /app/entry.sh".to_string(), &test.input, &test.answer)
    })?;

    match result {
        Err(DockerError::UnsuccessfulCommand { stderr }) => Ok(TestResult {
            test_number: test.test_number,
            run_result: TestRunResult::TestError {
                error: format!("Docker run failed: {:?}", stderr),
            },
        }),
        Err(DockerError::Timeout) => Ok(TestResult {
            test_number: test.test_number,
            run_result: TestRunResult::TestError {
                error: "Test timed out".to_string(),
            },
        }),
        Err(DockerError::UnexpectedError { error }) => Err(error),
        Ok(_) => Ok(TestResult {
            test_number: test.test_number,
            run_result: if compare_answer(test)? {
                TestRunResult::Correct {
                    stats: TestStats {
                        time_elapsed_ms: measurement.time_ms,
                        energy_consumed_j: measurement.energy_j,
                    },
                }
            } else {
                TestRunResult::Incorrect
            },
        }),
    }
}

fn prepare_context(
    source_code_path: &path::PathBuf,
    lang: Lang,
) -> Result<tempfile::TempDir, String> {
    let tmp_dir = tempdir().map_err(|_| "Could not create a temp directory")?;
    debug!("Created tmp dir {:?}", tmp_dir.path());
    let source_dir_target = tmp_dir.path().join("src");
    debug!(
        "Copying source code from {:?} into {:?}",
        source_code_path, source_dir_target
    );
    copy_dir_all(source_code_path, &source_dir_target)
        .map_err(|x| format!("Could copy source code content ({})", x))?;
    debug!(
        "Copying base image from {:?} into {:?}",
        lang.base_image(),
        tmp_dir.path()
    );
    copy_dir_all(lang.base_image(), &tmp_dir)
        .map_err(|x| format!("Could not read base image content {}", x))?;

    debug!(
        "Build context has the following content: {}",
        std::str::from_utf8(
            &process::Command::new("sh")
                .arg("-c")
                .arg(format!("ls -alt {:?}", tmp_dir.path()))
                .output()
                .unwrap()
                .stdout
        )
        .unwrap()
    );

    Ok(tmp_dir)
}

fn build_docker_image(context_directory: &path::Path) -> Result<DockerImage, DockerError> {
    DockerImage::build(context_directory)
}
