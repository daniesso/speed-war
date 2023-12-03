use std::path::{Path, PathBuf};

use clap::{Parser, Subcommand};
use serde::Serialize;
use serde_json::to_string_pretty;

use SpeedWarCLI::{run_problem, CLIResponseError, TestRunResult};
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

    evaluate(language, submission_path, tests_path);
}

fn evaluate(language: Lang, submission_path: &PathBuf, tests_path: &PathBuf) {
    match run_problem(language, submission_path, tests_path) {
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
        } => evaluate(*language, submission, tests),
    }
}
