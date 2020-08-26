# 0.1.5

- adds ctrl/cmd + v for pasting from clipboard
- adds ctrl/cmd + z / y for undo / redo
- adds ctrl/cmd + enter for new line
- internals now have underscore in name

# 0.1.4

- added onChange event
- no longer regenerates text on delete action while at end of string

# 0.1.3

- fixes bug with cursor position and empty string

# 0.1.2

- adds actionFocus function to give focus without having to supply a point
- fixes visual bug with cursor position
- invalid text is automatically stringified instead of throwing an error

# 0.1.1

- 'enter' to remove focus
- fixed fontScale option not working
- fixed alignment issue on new lines

# 0.1.0

- adds typeable text boxes
- option to use built in document listeners for mouse and keyboard input
- option to use api to manage externally