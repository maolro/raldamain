
// Save character to a text file
export function saveCharacterToFile(character) {
  const textData = `
    Name: ${character.name}
    Age: ${character.age}
    Race: ${character.race}
    Class: ${character.class}
    Attributes: ${JSON.stringify(character.attributes, null, 2)}
    Skills: ${character.skills.map((s) => `${s.name} (${s.level})`).join(', ')}
    Equipment: ${character.equipment.map((e) => `${e.name}`).join(', ')}
    Background: ${character.background}
  `;
  const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
  //saveAs(blob, `${character.name}_character_sheet.txt`);
}

// Load character from an uploaded text file
export function loadCharacterFromFile(file, setCharacter) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const newCharacter = parseCharacterSheet(text);
    setCharacter(newCharacter);
  };
  reader.readAsText(file);
}

// Parse a text-based character sheet
function parseCharacterSheet(text) {
  const lines = text.split('\n');
  let character = {};
  // Implement parsing logic based on line patterns
  // E.g., parse name, age, attributes, etc.
  lines.forEach((line) => {
    if (line.startsWith('Name:')) character.name = line.split(':')[1].trim();
    if (line.startsWith('Age:')) character.age = parseInt(line.split(':')[1].trim(), 10);
    // Continue parsing for other fields
  });
  return character;
}
