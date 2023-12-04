# Sjakkturnering

Spirit skal arrangere sjakkturnering. Alle deltakere skal spille mot alle andre. Dette gjennomføres på følgende måte: I parti 1 møtes spiller 1 og 2, 3 og 4, 5 og 6, osv... Etter det roterer spillerne som vist i bilden sånn at i parti 2 møtes spiller 1 og 4, 2 og 6, 3 og 8, osv... Spirit ønsker at det skal være lett for spillerne å finne ut hvem de skal møte i hvert parti og ber dere lage et program som finner ut det.

## Input:
En rad med tre tall:
    - antallet spillere (n) i turneringen (n <= 1000000, n er alltid et partall)
    - hvilken spillere (s) som ønsker å finne sin motstander (1 <= s <= n)
    - hvilket parti (p) spilleren ønsker å finne sin motstander for (1 <= p <= n-1)

## Output:
Hvilken spiller som s skal møte i parti p.

## Eksempler:

Input: 8 3 5
Output: 6

Input: 6 6 3
Output: 1
