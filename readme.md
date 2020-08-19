# The Three.js Typeable Text Library v0.0.1

The intention of this library is to make creation and integration of typeable text elements seamless with threejs.

## Usage:
```javascript
function init()
{
    // ... initialise threejs

    var textField = new ThreeEditableText({
        camera: camera,
        font: font,
        string: 'Hello text!'
    });
    
    scene.add(textField.getObject())
}

function updateCursor()
{
    // ... logic loop

    textField.updateCursor() // only used for displaying the cursor, not necessary for functionality
    
    // ... render loop
}
```

## Parameters:

**camera** A THREE.Camera (only needed if useDocumentListeners is true)

**font** The THREE.Font to use (always needed)

**string** The text to display

**useDocumentListeners**: Use built-in document listeners (default: true)

**material** A THREE.Material to use (default: `new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })`)

**align** Shifts the text. (options: 'left', 'center', 'right', default: 'center') 

**fontScale** Scales the geometry (default: 1)

## API:

Setting useDocumentListeners to false will require you to use the following functions to update the text manually

```javascript
// Change the text
textField.setText('New text!');

// To access the text as an object use
textField.getObject().position.setY(10)

// Move the cursor 3 letters to the right
textField.actionMoveCursor(3);

// Text will now display 'Ne text!'
textField.actionBackspace();

// Text will now display 'Netext!'
textField.actionDelete();

// Move the cursor 1 letter to the left
textField.actionMoveCursor(-1);

// Text will now display 'N8etext!'
textField.actionType('8');

// Check to see if the user has clicked
// This should run on your mouse click event
raycaster.setFromCamera(mouse, camera)
var intersections = raycaster.intersectObject(textField.getObject())
textField.actionClick(new THREE.Vector3( 3, 1, 0));
```

## Planned Features:

API
- mobile typing support
- shift + arrows to make selection
- shift + enter to make new line
- control + c / v / x - copy cut paste
- click and drag to make selection
- control + arrows to jump words
- control + delete / backspace to delete / backspace whole words
- better text alignment & spacing
- text outline
  - thickness
  - dotted
  - holed interior
- extrusion & bevel
- add onFocus / onUnFocus events

INTERNALS:
- generate letter by letter to not have to regenreate the whole string every time a letter is changed
- fix alignment of multiple lines