const dictionary = require('./cyrillic-latin-letters.json');

const createUrlChunk = (value, isAnchorLink = false) => {
  // let URLChunkInLatin = isAnchorLink ? '' : '/';  
  let URLChunkInLatin = '';
  let URLChunkInCyrillic = value
    .toLowerCase()    
    .match(/[а-я\s\d\-.]/g);

  URLChunkInCyrillic.forEach(cyrillicLetter => {    
      return dictionary.forEach(element => {
        if (element.cyrillic === cyrillicLetter) {
          return URLChunkInLatin += element.latin;
        }     
      });        
  });  
  return URLChunkInLatin;
}

module.exports = createUrlChunk;
