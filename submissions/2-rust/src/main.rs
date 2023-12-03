use std::io::{self, BufRead};

fn main() {
    let mut lines = io::stdin().lock().lines();

    let length = lines.next().unwrap().unwrap().parse::<u32>();
    let slimes = lines.next().unwrap().unwrap();

    let answer = slimes
        .chars()
        .zip(slimes.chars().skip(1))
        .fold(1, |acc, (a, b)| acc + if (a == b) { 0 } else { 1 });

    println!("{}", answer);
}
