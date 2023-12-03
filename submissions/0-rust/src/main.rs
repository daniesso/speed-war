use std::io::{self, BufRead};

fn main() {
    let answer = io::stdin()
        .lock()
        .lines()
        .map(|line| line.unwrap().split_whitespace().next().unwrap().to_string())
        .collect::<Vec<String>>()
        .join(" ");

    println!("{}", answer);
}
