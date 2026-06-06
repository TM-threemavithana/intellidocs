// Decode the byte array
const bytes1 = [78,97,116,117,114,97,108,32,76,97,110,103,117,97,103,101,32,80,114,111,99,101,115,115,105,110,103];
const bytes2 = [68,101,101,112,32,76,101,97,114,110,105,110,103,32,97,110,100,32,78,101,117,114,97,108,32,78,101,116,119,111,114,107,115];

console.log('Result 1 starts with:', String.fromCharCode(...bytes1));
console.log('Result 2 starts with:', String.fromCharCode(...bytes2));
