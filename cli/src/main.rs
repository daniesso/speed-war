use clap::Parser;
use serde::Serialize;
use serde_json::to_string_pretty;

use SpeedWarCLI::{run_problem, TestRunResult};
use SpeedWarCLI::{Lang, TestResult};

use log::debug;

#[derive(Parser)]
struct Cli {
    lang: Lang,
    problem_path: std::path::PathBuf,
}

#[derive(Serialize)]
enum CLIResponseVerdict {
    Accepted,
    Rejected,
}

#[derive(Serialize)]
enum CLIResponse {
    BuildError {
        error: String,
    },
    BuildTimeout {
        error: String,
    },
    TestTimeout {
        error: String,
    },
    TestResults {
        verdict: CLIResponseVerdict,
        tests: Vec<TestResult>,
    },
    InternalError {
        error: String,
    },
}

fn main() {
    env_logger::init();

    let args = Cli::parse();

    match run_problem(&args.problem_path, args.lang) {
        Ok(results) => {
            let all_tests_successful = results.iter().all(|result| match result.run_result {
                TestRunResult::Correct { stats: _ } => true,
                _ => false,
            });
            let test_result_response = if all_tests_successful {
                CLIResponseVerdict::Accepted
            } else {
                CLIResponseVerdict::Rejected
            };

            println!(
                "{}",
                to_string_pretty(&CLIResponse::TestResults {
                    verdict: test_result_response,
                    tests: results
                })
                .expect("Failed to serialize result to json")
            );
        }
        Err(error) => {
            debug!("Program experienced an error: {:?}", error);

            println!(
                "{}",
                to_string_pretty(&CLIResponse::InternalError { error: error })
                    .expect("Failed to serialize result to json")
            )
        }
    }
}
