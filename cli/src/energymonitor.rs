use std::{
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use serde::Deserialize;
use websocket::{ClientBuilder, OwnedMessage};

pub struct EnergyMonitor {
    pub ws_url: String,
}

pub struct MeasurementResult {
    pub time_ms: u32,
    pub energy_j: Option<f64>,
}

pub fn measure_fn<T>(
    energy_monitor_ws_url: Option<String>,
    func: &dyn Fn() -> T,
) -> Result<(T, MeasurementResult), String> {
    let monitor_service = energy_monitor_ws_url.map(|ws_url| EnergyMonitor { ws_url });

    let monitor = match monitor_service.map(|mon| mon.start()) {
        Some(Err(err)) => Err(err)?,
        Some(Ok(mon)) => Some(mon),
        None => None,
    };

    let start_time = chrono::offset::Utc::now();

    let result = func();

    let end_time = chrono::offset::Utc::now();
    let energy_consumed_j =
        monitor.map(|mon| mon.stop().calculate_consumed_energy(start_time, end_time));

    Ok((
        result,
        MeasurementResult {
            time_ms: (end_time - start_time).num_milliseconds() as u32,
            energy_j: energy_consumed_j,
        },
    ))
}

type WSClient = websocket::sync::Client<std::net::TcpStream>;

impl EnergyMonitor {
    pub fn start(self) -> Result<RunningEnergyMonitor, String> {
        let mut client: WSClient = ClientBuilder::new(&self.ws_url)
            .expect(format!("Could not parse WebSocket URL {}", self.ws_url).as_str())
            .connect_insecure()
            .map_err(|_| format!("Could not connect to WebSocket at {}", self.ws_url))?;

        client
            .set_nonblocking(true)
            .expect("Could not sent WS client nonblocking");

        let mut messages = vec![EnergyMonitor::receive(&mut client)?];

        let mutex = Arc::new(Mutex::new(false));
        let thread_mutex = Arc::clone(&mutex);

        let measurements_handle = thread::spawn(move || {
            while *thread_mutex.lock().unwrap() {
                messages.push(
                    EnergyMonitor::receive(&mut client)
                        .expect("Expected to receive energy measurement"),
                );
            }
            // One last message
            messages.push(
                EnergyMonitor::receive(&mut client)
                    .expect("Expected to receive one last energy measurement"),
            );

            messages
        });

        Ok(RunningEnergyMonitor {
            measurements_handle,
            stop_signal: Arc::clone(&mutex),
        })
    }

    fn receive(client: &mut WSClient) -> Result<EnergyMeasurement, String> {
        let message = timeout_recv_message(Duration::from_secs(5), client)
            .map_err(|err| format!("Receiving web socket message failed: {}", err));

        message.map(|msg| {
            if let OwnedMessage::Text(text) = msg {
                serde_json::from_str::<EnergyMeasurementDTO>(&text)
                    .map(|res| res.to_domain())
                    .map_err(|err| format!("Failed to parse message {}", text))
            } else {
                Err(format!("Unrecognized message from web socket {:?}", msg))
            }
        })?
    }
}

fn timeout_recv_message(duration: Duration, client: &mut WSClient) -> Result<OwnedMessage, String> {
    let start = Instant::now();

    while start.elapsed() < duration {
        if let Ok(val) = client.recv_message() {
            return Ok(val);
        }

        thread::sleep(Duration::from_millis(100))
    }

    Err("Timed out".to_string())
}

pub struct RunningEnergyMonitor {
    measurements_handle: std::thread::JoinHandle<Vec<EnergyMeasurement>>,
    stop_signal: Arc<Mutex<bool>>,
}

impl RunningEnergyMonitor {
    pub fn stop(self) -> EnergyMonitorResult {
        let mut mutex = self
            .stop_signal
            .lock()
            .expect("Failed to acquire mutex in order to stop EnergyMonitor");

        *mutex = true;

        let measurements = self
            .measurements_handle
            .join()
            .expect("Joining monitoring thread failed");

        EnergyMonitorResult { measurements }
    }
}

#[derive(Debug)]
pub struct EnergyMeasurement {
    power: f64,
    timestamp: chrono::DateTime<chrono::Utc>,
}

impl EnergyMeasurementDTO {
    fn to_domain(self) -> EnergyMeasurement {
        EnergyMeasurement {
            power: self.power,
            timestamp: self
                .timestamp
                .parse::<chrono::DateTime<chrono::Utc>>()
                .expect(format!("Should be able to parse timestamp {}", self.timestamp).as_str()),
        }
    }
}

pub struct EnergyMonitorResult {
    measurements: Vec<EnergyMeasurement>,
}

impl EnergyMonitorResult {
    pub fn calculate_consumed_energy(
        self,
        start: chrono::DateTime<chrono::Utc>,
        end: chrono::DateTime<chrono::Utc>,
    ) -> f64 {
        const STEP_SIZE_MS: usize = 50;

        // Assert is sorted
        self.measurements
            .iter()
            .zip(self.measurements.iter().skip(1))
            .for_each(|(first, second)| {
                assert!(first.timestamp <= second.timestamp);
            });

        (0..(end - start).num_milliseconds())
            .step_by(STEP_SIZE_MS)
            .map(|delta| {
                let step_start = start + chrono::Duration::milliseconds(delta);
                let step_end = std::cmp::min(
                    end,
                    step_start + chrono::Duration::milliseconds(STEP_SIZE_MS as i64),
                );
                let step_size = (step_end - step_start).num_milliseconds();

                assert!(step_size <= STEP_SIZE_MS as i64);
                assert!(start <= step_start);
                assert!(step_end <= end);

                let w = self
                    .measurements
                    .iter()
                    .filter(|m| step_start >= m.timestamp)
                    .next()
                    .expect("Expected to find measurements for all steps in interval");

                w.power * (step_size as f64) / 1000.0
            })
            .sum::<f64>()
    }
}

#[derive(Deserialize, Debug)]
pub struct EnergyMeasurementDTO {
    power: f64,
    timestamp: String,
}
