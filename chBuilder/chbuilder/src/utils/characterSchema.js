export const defaultCharacter = {
    name: '',
    age: '',
    race: '',
    class: '',
    attributes: {
      strength: 10,
      dexterity: 10,
      intelligence: 10,
    },
    skills: [],
    equipment: [],
    background: '',
  };
  
  export function validateCharacter(character) {
    // Add field validation logic here, e.g., type-checking, mandatory fields, etc.
    return true;  // Return true if valid, else throw errors or return false
  }
  