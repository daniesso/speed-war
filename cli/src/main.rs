use clap::Parser;
use serde::Serialize;
use serde_json::to_string_pretty;

use SpeedWarCLI::{run_problem, TestRunResult};
use SpeedWarCLI::{Lang, TestResult};

#[derive(Parser)]
struct Cli {
    lang: Lang,
    problem_path: std::path::PathBuf,
}

#[derive(Serialize)]
enum CLIResponseTestSuccess {
    Correct,
    Incorrect,
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
    TestsResults {
        result: CLIResponseTestSuccess,
        tests: Vec<TestResult>,
    },
}

fn main() {
    let args = Cli::parse();

    match run_problem(&args.problem_path, args.lang) {
        Ok(results) => {
            let all_tests_successful = results.iter().all(|result| match result.run_result {
                TestRunResult::Correct { stats: _ } => true,
                _ => false,
            });
            let test_result_response = if all_tests_successful {
                CLIResponseTestSuccess::Correct
            } else {
                CLIResponseTestSuccess::Incorrect
            };

            println!(
                "{}",
                to_string_pretty(&CLIResponse::TestsResults {
                    result: test_result_response,
                    tests: results
                })
                .expect("Failed to serialize result to json")
            );
        }
        Err(error) => {
            println!("Program experienced an error: {:?}", error)
        }
    }
}
