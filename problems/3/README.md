# Nisse på tur

Det er snart jul og julenissen holder på å planlegge slederuten sin sånn at han skal rekke å levere gaver til alle barna på "snill"-listen. Julenissen ble overrasket over hvor vanskelig det egentlig var å finne den korteste ruten, og trenger din hjelp!

Julenissen skal altså besøke N barn, hvor hvert barn er representert med et 2D-koordinat (`x`, `y`). Her er `x` og `y` heltall. Bruk Euklidsk avstand mellom to koordinater for å bedømme avstanden mellom dem.

I hvilken rekkefølge bør nissen besøke barna?

## Input/output

Første linje angir heltallet 1 <= N <= 11. Deretter følger N linjer med koordinater. Det første koordinatet beskriver koordinatene til nissens bolig. Reisen hans må alltid starte og slutte her.

Her vil det alltid finnes minst to riktige svar (hver rute kan reises begge veier). I slike tilfeller, velg den løsningen som kommer først leksiografisk ("0 1 2 0" i stedet for "0 2 1 0").

Eksempel:

Input:
3
135 712
519 912
855 318

Output:
0 1 2 0
