import * as THREE from 'three'
import { ShapePath } from 'three'

export default class ThreeEditableText
{
    constructor(args = {})
    {
        // parameters

        this.camera = args.camera
        this.font = args.font
        this.string = args.string || ''
        this.fontScale = args.fontScale === undefined ? 1 : args.fontScale
        this.material = args.material || new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
        this.useDocumentListeners = args.useDocumentListeners === undefined ? true : args.useDocumentListeners
        this.align = args.align === undefined ? 'center' : args.align.toLowerCase()
        this.onChange = args.onChange
        this.onFocus = args.onFocus
        this.maxEditHistory = args.maxEditHistory || 32
        
        // internals

        this._backgroundMaterial = new THREE.MeshBasicMaterial({ visible: false })
        this._midpoint = 0
        this._line_height = 0

        this._mouse = { x: 0, y: 0 }
        this._actionHistory = []
        this._currentHistoryIndex = 0

        this._group = new THREE.Group()
        this._letters = new THREE.Group()
        this._backgroundGroup = new THREE.Group()
        this._group.add(this._letters)
        this._group.add(this._backgroundGroup)
        
        this._vec3 = new THREE.Vector3()
        
        this._isTyping = false
        this._blinkingClock = new THREE.Clock()
        this._blinkingFrequency = 0.5
        this._blinkingLastChange = 0

        this._cursorPosition = new THREE.Vector3()
        this._cursorTextIndex = 0
        this._cursorVisible = false
        this._cursorGeometry = undefined
        this._cursorMesh = undefined

        this._createText()
        this._createCursor()
        this._makeCursorVisible(false)
        this._refreshCursor()

        if(this.useDocumentListeners)
            this.addDocumentListeners()
    }

    // === //
    // API //
    // === //

    addDocumentListeners()
    {
        this.raycaster = new THREE.Raycaster()

        this._onDocumentMouseDown = this._onDocumentMouseDown.bind(this)
        this._onDocumentMouseMove = this._onDocumentMouseMove.bind(this)
        // this._onDocumentTouchStart = this._onDocumentTouchStart.bind(this)
        // this._onDocumentTouchMove = this._onDocumentTouchMove.bind(this)
        this._onDocumentKeyPress = this._onDocumentKeyPress.bind(this)
        this._onDocumentKeyDown = this._onDocumentKeyDown.bind(this)

        document.addEventListener( 'mousedown', this._onDocumentMouseDown, false )
        document.addEventListener( 'mousemove', this._onDocumentMouseMove, false )
        // document.addEventListener( 'touchstart', this._onDocumentTouchStart, false )
        // document.addEventListener( 'touchmove', this._onDocumentTouchMove, false )
        document.addEventListener( 'keypress', this._onDocumentKeyPress, false )
        document.addEventListener( 'keydown', this._onDocumentKeyDown, false )
    }

    removeDocumentListeners()
    {
        this.raycaster = undefined

        document.removeEventListener( 'mousedown', this._onDocumentMouseDown )
        document.removeEventListener( 'mousemove', this._onDocumentMouseMove )
        // document.removeEventListener( 'touchstart', this._onDocumentTouchStart )
        // document.removeEventListener( 'touchmove', this._onDocumentTouchMove )
        document.removeEventListener( 'keypress', this._onDocumentKeyPress )
        document.removeEventListener( 'keydown', this._onDocumentKeyDown )
    }
    
    setText(text)
    {
        while(this._currentHistoryIndex > 0)
        {
            this._actionHistory.splice(0, 1)
            this._currentHistoryIndex--
        }
        this._actionHistory.unshift(this.string)
        while(this._actionHistory.length > this.maxEditHistory)
        {
            this._actionHistory.splice(this._actionHistory.length - 1, 1)
        }
        this.string = text
        this._createText()
    }

    getText()
    {
        return this.string
    }

    getLineHeight()
    {
        return this._line_height
    }

    getCursorIndex()
    {
        return this._cursorTextIndex
    }

    updateCursor()
    {
        if(!this._isTyping) return
        
        if(this._blinkingLastChange + this._blinkingFrequency < this._blinkingClock.getElapsedTime())
        {
            this._makeCursorVisible(!this._cursorVisible)
        }
    }

    actionType(newText)
    {
        if(!this._isTyping) return
        
        let newString = [this.string.slice(0, this._cursorTextIndex), newText, this.string.slice(this._cursorTextIndex)].join('')

        if(this.onChange)
            this.onChange(newString, 'Type', newText, this._cursorTextIndex)
        
        this.setText(newString)

        this._cursorTextIndex += newText.length
        this._refreshCursor()
    }

    actionBackspace()
    {
        if(!this._isTyping) return
        if(this._cursorTextIndex === 0) return

        let newString = [this.string.slice(0, this._cursorTextIndex - 1), this.string.slice(this._cursorTextIndex)].join('')
        
        if(this.onChange)
            this.onChange(newString, 'Backspace', this.string[this._cursorTextIndex - 1], this._cursorTextIndex)
        
        this.setText(newString)
        
        this._cursorTextIndex -= 1
        this._refreshCursor()
    }

    actionDelete()
    {
        if(!this._isTyping) return
        if(this._cursorTextIndex >= this._letters.children.length) return

        let newString = [this.string.slice(0, this._cursorTextIndex), this.string.slice(this._cursorTextIndex + 1)].join('')
        
        if(this.onChange)
            this.onChange(newString, 'Delete', this.string[this._cursorTextIndex], this._cursorTextIndex)
        
        this.setText(newString)
        
        this._refreshCursor()
    }

    actionMoveCursor(amount)
    {
        if(!this._isTyping) return
        this._cursorTextIndex += amount
        this._refreshCursor()
        this._makeCursorVisible(true)
    }

    actionFocus(focus)
    {
        this._isTyping = focus
        this._makeCursorVisible(focus)
    }

    actionClick(point)
    {
        if(point instanceof THREE.Vector3)
        {
            this._getCursorIndexByPoint(this._backgroundGroup.worldToLocal(point))
            this._refreshCursor()
            this._isTyping = true
            this._makeCursorVisible(true)
            if(this.onFocus)
                this.onFocus(true)
        }
        else
        {
            this._isTyping = false
            this._makeCursorVisible(false)
            if(this.onFocus)
                this.onFocus(false)
        }
    }

    actionUndo(amount)
    {
        if(!amount) return
        for(let i = 0; i < amount; i++)
        {
            if(this._currentHistoryIndex >= this._actionHistory.length - 1) return
            this._currentHistoryIndex++
            this.string = this._actionHistory[this._currentHistoryIndex]
        }
        this.onChange(this.string, 'Undo', this._actionHistory[this._currentHistoryIndex + amount], this._currentHistoryIndex)
        this._createText()
        this._refreshCursor()
    }

    actionRedo(amount)
    {
        if(!amount) return
        for(let i = 0; i < amount; i++)
        {
            if(this._currentHistoryIndex <= 0 ) return
            this._currentHistoryIndex--
            this.string = this._actionHistory[this._currentHistoryIndex]
        }
        this.onChange(this.string, 'Redo', this._actionHistory[this._currentHistoryIndex + amount], this._currentHistoryIndex)
        this._createText()
        this._refreshCursor()
    }

    getObject()
    {
        return this._group
    }

    // ========= //
    // INTERNALS //
    // ========= //

    _createText()
    {
        // remove previous text
        while(this._letters.children.length > 0)
        {
            this._letters.remove(this._letters.children[0])
        }
        while(this._backgroundGroup.children.length > 0)
        {
            this._backgroundGroup.remove(this._backgroundGroup.children[0])
        }

        this.string = String(this.string)

        const chars = Array.from ? Array.from( this.string ) : String( this.string ).split( '' ) // workaround for IE11, see #13988

        // taken from THREE.Font
        const scale = this.fontScale / this.font.data.resolution
        this._line_height = ( this.font.data.boundingBox.yMax - this.font.data.boundingBox.yMin + this.font.data.underlineThickness ) * scale

        let offsetX = 0, offsetY = 0, biggestX = 0, lineWidths = []

        for (let char of chars)
        {
            if (char === '\n')
            {
                // create a background for previous line
                let backgroundGeo = new THREE.PlaneBufferGeometry(biggestX, this._line_height)
                backgroundGeo.translate(0, offsetY + this._line_height / 2, 0)
                let backgroundMesh = new THREE.Mesh(backgroundGeo, this._backgroundMaterial)
                this._backgroundGroup.add(backgroundMesh)

                // create mock object for new line
                let obj = new THREE.Object3D()
                obj.userData.offset = { x: offsetX, y: offsetY, width: 0, height: this._line_height }
                this._letters.add(obj)

                lineWidths.push(offsetX)
                offsetX = 0
                offsetY -= this._line_height        
            }
            else
            {
                // clone of THREE.Font
                const ret = this._createPath(char, scale, offsetX, offsetY, this.font.data)
                
                let geometry = new THREE.ShapeBufferGeometry(ret.path.toShapes())
                let mesh = new THREE.Mesh(geometry, this.material)
                // userdata is used to save metadata
                mesh.userData.offset = { x: offsetX, y: offsetY, width: ret.offsetX, height: this._line_height }

                this._letters.add(mesh)

                offsetX += ret.offsetX

                if(offsetX > biggestX)
                    biggestX = offsetX
            }
        }
        // make one geometry for final line
        let backgroundGeo = new THREE.PlaneBufferGeometry(biggestX, this._line_height)
        backgroundGeo.translate(0, offsetY + this._line_height / 2, 0)
        let backgroundMesh = new THREE.Mesh(backgroundGeo, this._backgroundMaterial)
        this._backgroundGroup.add(backgroundMesh)
        lineWidths.push(offsetX)

        let line = 0, i = 0
        
        // do alignment
        for(let char of chars)
        {
            if(this.align === 'center')
            {
                this._letters.children[i].position.setX(-lineWidths[line] / 2)
                this._letters.children[i].userData.offset.x -= lineWidths[line] / 2
            }
            else if(this.align === 'right')
            {
                this._letters.children[i].position.setX(-lineWidths[line])
                this._letters.children[i].userData.offset.x -= lineWidths[line]
            }

            if (char === '\n')
                line++
            i++
        }
    }

    _createCursor()
    {
        let size = this._line_height

        this._cursorGeometry = new THREE.PlaneBufferGeometry(size * 0.1 * 0.75, size * 0.75)
        this._cursorGeometry.translate(0, size * 0.5 * 0.75, 0)
        this._cursorMesh = new THREE.Mesh(this._cursorGeometry, this.material)
        this._group.add(this._cursorMesh)
    }

    _refreshCursor()
    {
        if(this._cursorTextIndex < 0)
            this._cursorTextIndex = 0
        
        if(this._cursorTextIndex > this._letters.children.length)
            this._cursorTextIndex = this._letters.children.length
        
        if(this._letters.children.length === 0)
        {

        }
        else if(this._cursorTextIndex >= this._letters.children.length)
        {
            let child = this._letters.children[this._letters.children.length - 1]
            this._cursorMesh.position.set(child.userData.offset.x + child.userData.offset.width, child.userData.offset.y, 0)
        }
        else
        {
            let child = this._letters.children[this._cursorTextIndex]
            this._cursorMesh.position.set(child.userData.offset.x, child.userData.offset.y, 0)
        }
    }

    _makeCursorVisible(visible)
    {
        this._cursorVisible = visible
        this._cursorMesh.visible = this._cursorVisible
        this._blinkingLastChange = this._blinkingClock.getElapsedTime()
    }

    _getCursorIndexByPoint(point)
    {
        for(let i in this._letters.children)
        {
            let child = this._letters.children[Number(i)]
            if(
                point.x >= child.userData.offset.x
                &&  point.y >= child.userData.offset.y 
                &&  point.x <= child.userData.offset.x + (child.userData.offset.width * 0.5)
                &&  point.y <= child.userData.offset.y + child.userData.offset.height
            )
            {
                this._cursorTextIndex = Number(i)
                return
            } 
            else if(
                point.x >= child.userData.offset.x + (child.userData.offset.width * 0.5)
                &&  point.y >= child.userData.offset.y 
                &&  point.x <= child.userData.offset.x + child.userData.offset.width
                &&  point.y <= child.userData.offset.y + child.userData.offset.height
            )
            {
                this._cursorTextIndex = Number(i) + 1
                return
            }
        }
    }

    _onDocumentMouseDown(event)
    {
        event.preventDefault()

        this.raycaster.setFromCamera(this._mouse, this.camera)
        let intersections = this.raycaster.intersectObjects(this._backgroundGroup.children, true)
        this.actionClick(intersections.length > 0 ? intersections[0].point : false)
    }

    _onDocumentMouseMove(event)
    {
        this._mouse.x = 2 * (event.clientX / window.innerWidth - 0.5)
        this._mouse.y = -2 * (event.clientY / window.innerHeight - 0.5)
    }

    _onDocumentKeyDown(event)
    {
        var keyCode = event.key
        if(keyCode === 'Backspace') // backspace
        {
            this.actionBackspace()
            return false
        }
        if(keyCode === 'Delete') // delete
        {
            this.actionDelete()
            return false
        }
        if(keyCode === 'Enter') // escape
        {
            if(event.ctrlKey || event.metaKey)
                this.actionType('\n')
            else
                this.actionClick()
            return false
        }
        if(keyCode === 'ArrowLeft') // left arrow
        {
            this.actionMoveCursor(-1)
            return false
        }
        if(keyCode === 'ArrowRight') // right arrow
        {
            this.actionMoveCursor(1)
            return false
        }
        if(keyCode === 'v' && (event.ctrlKey || event.metaKey))
        {
            navigator.clipboard.readText().then(clipText => this.actionType(clipText))
            return false
        }
        if(keyCode === 'z' && (event.ctrlKey || event.metaKey))
        {
            this.actionUndo(1)
            return false
        }
        if(keyCode === 'y' && (event.ctrlKey || event.metaKey))
        {
            this.actionRedo(1)
            return false
        }
        if(keyCode.length === 1)
        {
            this.actionType(keyCode)
            return false
        }
    }

    _onDocumentKeyPress(event)
    {
        // console.log('_onDocumentKeyPress',event)
        // var keyCode = event.key
        // if(keyCode.length > 1) // not an character key
        //     return false
        // this.actionType(keyCode)
    }

    // TODO
    // _onDocumentTouchStart(event)
    // {
    //     if (event.touches.length == 1)
    //     {
    //     }
    // }

    // _onDocumentTouchMove(event)
    // {
    //     if(event.touches.length == 1)
    //     {
    //     }
    // }

    // Taken from THREE.Font - need to see if there is a way to expose this function natively
    _createPath( char, scale, offsetX, offsetY, data ) {

        const glyph = data.glyphs[ char ] || data.glyphs[ '?' ]

        if ( ! glyph ) {

            console.error( 'FontExtension: character "' + char + '" does not exists in font family ' + data.familyName + '.' )

            return

        }

        const path = new ShapePath()

        let x, y, cpx, cpy, cpx1, cpy1, cpx2, cpy2

        if ( glyph.o ) {

            const outline = glyph._cachedOutline || ( glyph._cachedOutline = glyph.o.split( ' ' ) )

            for ( let i = 0, l = outline.length; i < l; ) {

                const action = outline[ i ++ ]

                switch ( action ) {

                    case 'm': // moveTo

                        x = outline[ i ++ ] * scale + offsetX
                        y = outline[ i ++ ] * scale + offsetY

                        path.moveTo( x, y )

                        break

                    case 'l': // lineTo

                        x = outline[ i ++ ] * scale + offsetX
                        y = outline[ i ++ ] * scale + offsetY

                        path.lineTo( x, y )

                        break

                    case 'q': // quadraticCurveTo

                        cpx = outline[ i ++ ] * scale + offsetX
                        cpy = outline[ i ++ ] * scale + offsetY
                        cpx1 = outline[ i ++ ] * scale + offsetX
                        cpy1 = outline[ i ++ ] * scale + offsetY

                        path.quadraticCurveTo( cpx1, cpy1, cpx, cpy )

                        break

                    case 'b': // bezierCurveTo

                        cpx = outline[ i ++ ] * scale + offsetX
                        cpy = outline[ i ++ ] * scale + offsetY
                        cpx1 = outline[ i ++ ] * scale + offsetX
                        cpy1 = outline[ i ++ ] * scale + offsetY
                        cpx2 = outline[ i ++ ] * scale + offsetX
                        cpy2 = outline[ i ++ ] * scale + offsetY

                        path.bezierCurveTo( cpx1, cpy1, cpx2, cpy2, cpx, cpy )

                        break

                }

            }

        }

        return { offsetX: glyph.ha * scale, path: path }
    }
}