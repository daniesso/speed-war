# Speed Warz

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

5. Verifiser at du får en JSON-output som inneholder to tester med tidsforbruk.
