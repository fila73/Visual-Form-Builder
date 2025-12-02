export const VFPRuntimeCode = `
import tkinter as tk
from tkinter import messagebox

class VFPRuntime:
    @staticmethod
    def MessageBox(text, flags=0, title="Message"):
        """
        Mimics VFP MessageBox function.
        Returns:
        1 = OK
        2 = Cancel
        3 = Abort
        4 = Retry
        5 = Ignore
        6 = Yes
        7 = No
        """
        icon = "info"
        type_ = "ok"
        
        # Return values
        retval = {"ok": 1,
                  "cancel": 2,
                  "abort": 3,
                  "retry": 4,
                  "ignore": 5,
                  "yes": 6,
                  "no": 7
                 }
        # Icons
        if flags & 16: icon = "error"      # Stop
        elif flags & 32: icon = "question" # Question
        elif flags & 48: icon = "warning"  # Exclamation
        elif flags & 64: icon = "info"     # Information
        
        # Buttons
        flags = flags%16
        if flags == 1: type_ = "okcancel"
        elif flags == 2: type_ = "abortretryignore"
        elif flags == 3: type_ = "yesnocancel"
        elif flags == 4: type_ = "yesno"
        elif flags == 5: type_ = "retrycancel"

        return retval.get(messagebox.askquestion(title, text, type = type_, icon=icon))

    @staticmethod
    def RGB(r, g, b):
        """Converts RGB values to Hex color string."""
        return f"#{r:02x}{g:02x}{b:02x}"

    @staticmethod
    def Alltrim(text):
        """Removes leading and trailing whitespace."""
        return str(text).strip()

    @staticmethod
    def Len(obj):
        """Returns length of string or list."""
        return len(obj)

    @staticmethod
    def Substr(text, start, length=None):
        """
        VFP Substr is 1-based.
        Python slice is 0-based.
        """
        if text is None: return ""
        s_idx = start - 1
        if s_idx < 0: s_idx = 0
        if length is None:
            return text[s_idx:]
        return text[s_idx:s_idx+length]
`;
