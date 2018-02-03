/* Porchwire Project Copright 2018 

PW.js is a library of objects and functions under the 'PW'
namespace for supporting feature development during prototyping
phases. Most, or all of the methods deined here will probably end
up in the form of es6 classes or defined in Typescript as Angular
modules and components.

*/

let PW = {

    // Porchwire application specific meta values
    META: {

    },

    // Porchwire User Interface
    UI: {

    },

    // Work with Google Drive Elements
    gdrive: {

        // PW.gdrive.newSaveToDriveElement
        newSaveToDriveElement: function(htmltag, src, fname, sitename) {
            this.src = src;
            this.fname = fname;
            this.sitename = sitename;

            let el = document.createElement(htmltag);
            el.type = 'button';
            el.className = 'g-savetodrive';
            el.setAttribute('data-src', src);
            el.setAttribute('data-filename', fname);
            el.setAttribute('data-sitename', sitename);
        },

    },

    // Work with Audio
    Audio: {

    },

    // Porchwire network / fetch 
    Net: {


    },

}
