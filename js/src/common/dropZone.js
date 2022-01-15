import '../lib/uuid.min.js';

export function createDropZone(target, $url) {
    const DROPZONEID = uuid.v4();
    const dropZoneHTML = `<div id="${DROPZONEID}" style="height: 100px; border-width: 2px; margin-bottom: 20px;border-style: dashed;
    border-color: #ccc;text-align: center;line-height: 100px;">Drag & Drop image file here or Click to upload</div>
    <div id='imagePreview'></div>`

    target.append(dropZoneHTML);
    const dropZone = document.getElementById(DROPZONEID);
    const fakeInput = document.createElement("input");
    fakeInput.type = "file";
    fakeInput.accept = "image/*";
    fakeInput.multiple = false;
    dropZone.addEventListener('click', function() {
      fakeInput.click();
    });

    fakeInput.addEventListener("change", function() {
      var file = fakeInput.files[0];
      handleFileSelect(file);
    });

    function handleDrop(evt) {
      evt.stopPropagation();
      evt.preventDefault();
  
      var file = evt.dataTransfer.files[0]; 
      handleFileSelect(file)
    }

    function handleFileSelect(file) {

      if (!file.type.startsWith('image/')){ 
        $(`#${DROPZONEID}`).css("border-color", "red");
          return;
      }

      const url = URL.createObjectURL(file);
      $(`#${DROPZONEID}`).css({"background-image": "url('"+url+"'),"+"url('"+url+"')",
                     "background-size": "contain, 1000%", "background-repeat": "no-repeat, no-repeat",
                     "background-position": "center, center"})
      $(`#${DROPZONEID}`).css("border-color", "#ccc");
      $url.val(url);

    }
  
    function handleDragEnter(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      $(`#${DROPZONEID}`).css("border-color", "green");
    }
  
    function handleDragLeave(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      $(`#${DROPZONEID}`).css("border-color", "#ccc");
    }
  
    function handleDragOver(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }

    // Setup the dnd listeners.
    dropZone.addEventListener('dragenter', handleDragEnter, false);
    dropZone.addEventListener('dragleave', handleDragLeave, false);
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleDrop, false);

    return DROPZONEID;
}