import sys

def print_first_words():
    first_words = []
    for line in sys.stdin:
        words = line.strip().split()
        if words:
            first_words.append(words[0])
    
    print(' '.join(first_words))

print_first_words()