use clap::Parser;
use SpeedWarCLI::run_problem;
use SpeedWarCLI::Lang;

#[derive(Parser)]
struct Cli {
    lang: Lang,
    problem_path: std::path::PathBuf,
}

fn main() {
    let args = Cli::parse();

    match run_problem(&args.problem_path, args.lang) {
        Ok(result) => {
            println!(
                "Program ran successfully ({} ms, {} J)",
                result.time_elapsed_ms, result.energy_consumed_j
            );
        }
        Err(error) => {
            println!("Program experienced an error: {:?}", error)
        }
    }
}
