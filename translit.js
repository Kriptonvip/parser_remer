function rus_to_latin ( str ) {
    str.trim(' ');
    var ru = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 
        'е': 'e', 'ё': 'e', 'ж': 'j', 'з': 'z', 'и': 'i', 
        'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
        'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 
        'щ': 'shch', 'ы': 'y', 'э': 'e', 'ю': 'u', 'я': 'ya',
        'ъ': 'ie', 'ь': '', 'й': 'i', ' ':'-', '!':'', ',':'-',"'":'',
        '+':'','(':'',')':'', '.':'', '/':'','*':'','\n':'-'
    }, n_str = [];
    const strTrim = str.trim().toLowerCase();    
    for ( var i = 0; i < strTrim.length; ++i ) {
       n_str.push(
              ru[ strTrim[i].toLowerCase() ]
           || ru[ strTrim[i].toLowerCase() ] == undefined && strTrim[i]
           || ru[ strTrim[i].toLowerCase() ]
       );
    }
    
    return n_str.join('');
}

// const string = rus_to_latin('Раковина напольная\nс отверстием под смеситель');
// console.log(string);

export default rus_to_latin;