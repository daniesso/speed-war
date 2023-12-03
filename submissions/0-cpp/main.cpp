#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line, firstWords;

    while (std::getline(std::cin, line)) {
        std::istringstream iss(line);
        std::string word;
        iss >> word;
        if (!word.empty()) {
            firstWords += word + " ";
        }
    }

    // Trim trailing space
    if (!firstWords.empty() && firstWords[firstWords.size() - 1] == ' ') {
        firstWords.pop_back();
    }

    std::cout << firstWords << std::endl;

    return 0;
}