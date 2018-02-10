/* Porchwire Project Copright 2018 

PW.js is a library of objects and functions under the 'PW'
namespace for supporting feature development during prototyping
phases. Most, or all of the methods defined here will probably end
up in the form of es6 classes or defined in Typescript as Angular
modules, components, and services.
*/

let PW = {

    // Porchwire application specific meta values
    META: {

    },

    // Porchwire User Interface
    UI: {

        // PW.UI.newRecordedFileElement(file)
        // File is the result of call to window.URL.createObjectURL(blobfile);
        newRecordedFileElement: function(file) {
            this.file = file;
            
            let wrap = document.createElement('div');
            wrap.className = "recorded-file-wrapper";

            let audio = document.createElement('audio');
            audio.setAttribute('controls', true);
            audio.src = this.file;

            let link = document.createElement('a');
            link.className = "download-icon";
            link.innerHTML = '<i class="fas fa-download"></i>';
            link.href = this.file;
            link.setAttribute('download', this.file);

            let gdrive = PW.gdrive.newSaveToDriveElement(
                'span',
                this.file,
                'Porchwire-Audio-' + Date.now() + '.ogg',
                'Porchwire'
            );

            gdrive.innerHTML = '<i class="fab fa-google-drive"></i>';

            wrap.appendChild(audio);
            wrap.appendChild(link);
            wrap.appendChild(gdrive);

            return wrap;
        },

    },

    // Work with Google Drive Elements
    gdrive: {

        // PW.gdrive.newSaveToDriveElement
        newSaveToDriveElement: function(htmltag, src, fname, sitename) {
            this.src = src;
            this.fname = fname;
            this.sitename = sitename;

            let el = document.createElement(htmltag);
            el.type = htmltag;
            el.className = 'g-savetodrive';
            el.setAttribute('data-src', this.src);
            el.setAttribute('data-filename', this.fname);
            el.setAttribute('data-sitename', this.sitename);

            return el;
        },

    },

    // Work with Audio
    Audio: {

    },

    // Porchwire network / fetch 
    Net: {


    },

}
