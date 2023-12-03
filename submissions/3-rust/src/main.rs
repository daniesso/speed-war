use itertools::Itertools;
use std::cmp::Ordering;
use std::io::{self, BufRead};
fn euclidean(cities: &Vec<(i32, i32)>, i: usize, j: usize) -> f64 {
    let (ax, ay) = cities[i];
    let (bx, by) = cities[j];

    ((ax - bx).pow(2) as f64 + (ay - by).pow(2) as f64).sqrt()
}

fn calc_length(cities: &Vec<(i32, i32)>, perm: &Vec<usize>) -> f64 {
    perm.iter()
        .zip(perm.iter().skip(1))
        .map(|(i, j)| euclidean(cities, *i, *j))
        .sum::<f64>()
        + euclidean(cities, 0, perm[0])
        + euclidean(cities, *perm.last().unwrap(), 0)
}

fn main() {
    let mut lines = io::stdin().lock().lines();

    let num_children = lines.next().unwrap().unwrap().parse::<u32>();
    let cities = lines
        .map(|line| {
            let binding = line
                .unwrap()
                .split_whitespace()
                .map(|c| c.parse::<i32>().unwrap())
                .collect::<Vec<i32>>();

            let [x, y] = binding.as_slice() else {
                panic!("boom");
            };

            (*x, *y)
        })
        .collect::<Vec<(i32, i32)>>();

    let binding = (1..cities.len())
        .permutations(cities.len() - 1)
        .min_set_by(|first, second| {
            let first_length = calc_length(&cities, &first);
            let second_length = calc_length(&cities, &second);

            if (first_length - second_length).abs() < 1e-10 {
                first
                    .iter()
                    .map(|i| i.to_string())
                    .collect::<Vec<_>>()
                    .join("")
                    .cmp(
                        &second
                            .iter()
                            .map(|i| i.to_string())
                            .collect::<Vec<_>>()
                            .join(""),
                    )
            } else {
                first_length.total_cmp(&second_length)
            }
        });

    if binding.len() != 1 {
        panic!("wtf");
    }

    let result = binding.iter().next().unwrap();

    println!(
        "{} {} {}",
        0,
        result
            .iter()
            .map(|i| i.to_string())
            .collect::<Vec<_>>()
            .join(" "),
        0
    );
}
