# Summering

Gitt en liste men n heltall (indexert fra 0 til n-1). Skriv et program som støtter følgende to operasjoner på listen:

- Addere et gitt tall til et av talene i listen.
- Beregne summen av alle tall fra starten av listen til en gitt posisjon.

## Input:
- En rad med to tall (n og o) der n er antall elementer i listen (n <= 1000000) og o er antall operasjoner som skal gjennomføres (o <= 1000000).
- o rader med operasjoner på et av følgende format:
    - "+ i d": Addere d til element i i listen. (-1000 <= d <= 1000)
    - "? i": Beregne summen av elementene fra 0 til og med i-1 i listen. (0 <= i <= n)

## Output:
- En rad for hver ?-operasjon summen som er beregnet.


## Eksempel 1:

Input:
```
10 4
+ 7 23
? 8
+ 3 17
? 8
```

Output:
```
23
40
```


## Eksempel 2:

Input:
```
5 4
+ 0 -43
+ 4 1
? 0
? 5
```

Output:
```
0
-42
```
