use std::path::{Path, PathBuf};

use clap::{Parser, Subcommand};
use serde::Serialize;
use serde_json::to_string_pretty;

use SpeedWarCLI::{run_problem, CLIResponseError, RepeatTestsParams, TestRunResult};
use SpeedWarCLI::{Lang, TestResult};

use log::debug;

/// CLI to test submissions in one of several languages using test input
#[derive(Parser)]
#[command(version, long_about = None)]
struct CLI {
    #[command(subcommand)]
    command: CLICommands,
}

#[derive(Subcommand)]
enum CLICommands {
    /// Run tests for a given problem
    Test {
        #[arg(long)]
        language: Lang,

        /// Problem number (1, 2, 3)
        #[arg(long)]
        problem: u8,
    },

    /// Run tests in a more flexible manner, accepting arbitrary tests and submission paths.
    Evaluate {
        #[arg(long)]
        language: Lang,

        /// Path to the tests folder
        #[arg(long)]
        tests: PathBuf,

        /// Path to the submission folder
        #[arg(long)]
        submission: PathBuf,

        /// Each test should at least be repeated the specified number of times.
        #[arg(long)]
        min_num_test_trials: Option<u8>,

        /// Each test should at least be repeated a number of times so that we measure
        /// for at least the specified number of seconds.
        #[arg(long)]
        min_seconds_test_trials: Option<u8>,
    },
}

#[derive(Serialize)]
enum CLIResponseVerdict {
    Accepted,
    Rejected,
}

#[derive(Serialize)]
enum CLIResponse {
    TestResults {
        verdict: CLIResponseVerdict,
        tests: Vec<TestResult>,
    },
    Error {
        error: CLIResponseError,
    },
}

fn test(language: Lang, problem: u8) {
    let submission_path = &Path::new("../submissions").join(problem.to_string());

    let tests_path = &Path::new("../problems")
        .join(problem.to_string())
        .join("tests");

    evaluate(language, submission_path, tests_path, None);
}

fn evaluate(
    language: Lang,
    submission_path: &PathBuf,
    tests_path: &PathBuf,
    repeat_test_params: Option<RepeatTestsParams>,
) {
    match run_problem(language, submission_path, tests_path, repeat_test_params) {
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
                to_string_pretty(&CLIResponse::Error { error })
                    .expect("Failed to serialize result to json")
            )
        }
    }
}

fn main() {
    env_logger::init();

    let args = CLI::parse();
    match &args.command {
        CLICommands::Test { language, problem } => test(*language, *problem),
        CLICommands::Evaluate {
            language,
            submission,
            tests,
            min_num_test_trials,
            min_seconds_test_trials: min_time_test_trials,
        } => {
            assert!(min_num_test_trials.is_some() == min_time_test_trials.is_some(), 
                "--min-num-test-trials and --min-time-test-trials arguments must either both be present, or neither");

            evaluate(
                *language,
                submission,
                tests,
                min_num_test_trials.map(|min_num_test| RepeatTestsParams{
                    min_num_test_trials: min_num_test,
                    min_time_test_trials: std::time::Duration::from_secs(min_time_test_trials.unwrap() as u64)
                } ),
            )
        }
    }
}
