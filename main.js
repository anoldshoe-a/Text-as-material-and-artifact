
    const DATAMUSE_URL = 'https://api.datamuse.com/words?rel_rhy=';
    const POETRYDB_URL = 'https://poetrydb.org/';
    const API_KEY = "Key here";

    const url = "https://api.openai.com/v1/chat/completions";

let options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + API_KEY,
  },
};




    function getLastWord(line) {
        const words = line.trim().split(' ');
        return words.length > 0 ? words[words.length - 1].replace(/[.,?!]/, '').toLowerCase() : '';
    }

    // Fetch rhyming words using the Datamuse API
    async function fetchRhymingWords(word) {
        try {
            const response = await fetch(`${DATAMUSE_URL}${word}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const rhymes = await response.json();
            console.log(`Rhyming words for "${word}":`, rhymes);
            return rhymes.map(entry => entry.word);
        } catch (error) {
            console.error('Error fetching rhyming words:', error.message);
            return [];
        }
    }

    // Fetch poems based on a specific author from PoetryDB
    async function fetchPoemsByAuthor(author) {
        try {
            const response = await fetch(`${POETRYDB_URL}author/${author}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("Poem data from PoetryDB:", data);

            if (!data || data.length === 0 || !data[0].lines) {
                console.error('No valid poem lines found in the response.');
                return [];
            }

            return data[0].lines;
        } catch (error) {
            console.error('Error fetching poems by author:', error.message);
            return [];
        }
    }


    function isValidLine(line) {
        return line && line.trim().length > 0; // Check if line is empty
    }

    // Generate a poem based on rhyme scheme
    async function generatePoem(rhymeScheme) {
        const poem = [];
        const usedRhymes = new Set(); // track rhyming words already used
        const rhymeGroups = {}; // To group lines by rhyme letters

        const author = 'William Shakespeare'; // Poet by name
        const allLines = await fetchPoemsByAuthor(author);

        if (!allLines || allLines.length === 0) {
            poem.push('[No rhymes found]');
            return poem;
        }

        let lastRhyme = null; // last rhyme group
        let lastLine = null; // last selected line

        for (const letter of rhymeScheme) {
            let selectedLine = null;

            if (letter === lastRhyme) {
                // If the letter is same as previous, find rhyming words and pick a rhyming line
                const lastWord = getLastWord(lastLine);
                const rhymingWords = await fetchRhymingWords(lastWord);

                if (rhymingWords.length === 0) {
                    // no rhymes found, add a random line
                    do {
                        selectedLine = allLines[Math.floor(Math.random() * allLines.length)];
                    } while (!isValidLine(selectedLine)); // Keeplooking
                    poem.push(`${selectedLine} (R*${letter})`); // Add "(R*)" for random line

                    usedRhymes.add(getLastWord(selectedLine)); // used
                    lastLine = selectedLine; // Update last line
                    lastRhyme = letter; // new rhyme group

                    continue;
                }

                // Find a matching line with a rhyming last word
                selectedLine = allLines.find(line => {
                    const lineLastWord = getLastWord(line);
                    return rhymingWords.includes(lineLastWord) && !usedRhymes.has(lineLastWord) && isValidLine(line);
                });

                if (selectedLine) {
                    poem.push(`${selectedLine} (${letter})`); // Add letter
                    usedRhymes.add(getLastWord(selectedLine)); // used
                    lastLine = selectedLine; // Update last line
                } else {
                    // If no rhyming line found, add a random line and mark it with "(R*)"
                    do {
                        selectedLine = allLines[Math.floor(Math.random() * allLines.length)];
                    } while (!isValidLine(selectedLine)); // make sure the line is not empty
                    poem.push(`${selectedLine} (R*${letter})`); // add "(R*)" for random line

                    usedRhymes.add(getLastWord(selectedLine)); // used
                    lastLine = selectedLine; // Update last line
                    lastRhyme = letter; // new rhyme group

                }
            } else {
                // If the letter is different from the last, pick a random line
                do {
                    selectedLine = allLines[Math.floor(Math.random() * allLines.length)];
                } while (!isValidLine(selectedLine)); // Keep lookng

                poem.push(`${selectedLine} (${letter})`); // Add random line with letter
                lastLine = selectedLine; // Update last line
                lastRhyme = letter; // new rhyme group
                usedRhymes.add(getLastWord(selectedLine)); // rhyme used
            }
        }
        return poem;
    }


    document.addEventListener('DOMContentLoaded', () => {
        const button = document.getElementById('generate');
        const output = document.getElementById('poem-output');
        const output1 = document.getElementById('compound-output');
        const rhymeSchemeInput = document.getElementById('rhyme-scheme');

        button.addEventListener('click', async () => {
            const prompt = "Can you give me the name and chemical formula of a random chemical compound? For example:'Ethanol,C2H6O', Please respond with the Name of the chemical, and the chemical formula. Make sure it is in the example format, do not include any other additional texts. Thanks";
            console.log("Sending prompt:", prompt);
            options.body = JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { "role": "system", "content": "You are a helpful assistant." },
                    { "role": "user", "content": prompt }
                ]
            });

            let sequence = '';
            let sequenceRhyme = '';
            let i = 0;

            try {

                const response = await fetch(url, options);
                const responseData = await response.json();

                if (responseData.choices && responseData.choices[0]) {
                    const resultT = responseData.choices[0].message.content;

                    console.log("ChatGPT Response:", resultT);
                    output1.innerHTML = resultT;
                    // const regex = /(?<=,)[ A-Za-z0-9]+/; //everything after the comma
                    // let outcome = resultT.match(regex);

                    let outcome = resultT.slice(resultT.indexOf(','), resultT.length);
                    console.log(outcome)
                    outcome = outcome.match(/([A-Z0-9])+/g)
                    outcome[0].trim()
                    console.log(outcome);
                    if(outcome[1] === undefined){
                    sequence = outcome[0];
                  } else {sequence = outcome[0]+outcome[1]}
                    console.log("Initial sequence:", sequence);
                }

                // Generate sequenceRhyme
                while (i < sequence.length) {
                    let char = sequence[i];
                    if (isNaN(char)) {
                        let count = '';
                        let j = i + 1;

                        // Collect all consecutive numbers
                        while (j < sequence.length && !isNaN(sequence[j])) {
                            count += sequence[j];
                            j++;
                        }

                        if (count) {
                            sequenceRhyme += char.repeat(parseInt(count));
                            i = j; // Skip past the number
                        } else {
                            sequenceRhyme += char; // add the letter
                            i++;
                        }
                    } else {
                        i++; // skip invalid characters
                    }
                }

                console.log("Final sequenceRhyme:", sequenceRhyme);

                const rhymeScheme = sequenceRhyme.trim().toUpperCase();
                console.log("Rhyme Scheme:", rhymeScheme);

                if (!rhymeScheme) {
                    output.innerHTML = '<p>Please enter a valid rhyme scheme!</p>';
                    return;
                }

                output.innerHTML = '<p>Generating poem...</p>';
                const poem = await generatePoem(rhymeScheme);
                output.innerHTML = poem.map(line => `<p>${line}</p>`).join('');

            } catch (error) {
                console.error("Error with the fetch request:", error);
            }
        });
    });
