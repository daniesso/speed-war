# Speed Warz

## Mappestruktur

Oppgavene finner du i mappen "problems". Her finner du en README med en oppgavetekst. I tillegg finner du utdelte tester du kan bruke i undermappen `tests`. Ikke snok i mappen `secret_tests` dog! Denne er hemmelig!

Legg besvarelsene dine i mappen "submissions". Da kan du bruke CLI-et til å kjøre testene før du laster opp, så vet du at du er på riktig spor.

## Komme i gang

1. Bygg SpeedWar CLI-et:

```
cd cli && cargo build --release && cp target/release/SpeedWarCLI .
```

2. Sjekk at du har Docker tilgjengelig.
3. Test oppgave 0 med CLI-et. Gå inn i submissions-mappen og endre navn på en av mappene til `0`. For eksempel:

```
mv 0-python 0
```

4. Kjør testene med:

```
./SpeedWarCLI test --language python --problem 0
```

Eventuelt, for å skru på debug-logging, bruk

```
RUST_LOG=debug ./SpeedWarCLI test --language python --problem 0
```

5. Verifiser at du får en JSON-output som inneholder to godkjente tester.
