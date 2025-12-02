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
        6 = Yes
        7 = No
        """
        icon = "info"
        type_ = "ok"
        
        # Icons
        if flags & 16: icon = "error"      # Stop
        elif flags & 32: icon = "question" # Question
        elif flags & 48: icon = "warning"  # Exclamation
        elif flags & 64: icon = "info"     # Information
        
        # Buttons
        if flags & 4: type_ = "yesno"
        elif flags & 1: type_ = "okcancel"
        elif flags & 2: type_ = "abortretryignore" # Not fully supported in simple mapping
        elif flags & 3: type_ = "yesnocancel"
        elif flags & 5: type_ = "retrycancel"
        
        if type_ == "yesno":
            return 6 if messagebox.askyesno(title, text, icon=icon) else 7
        elif type_ == "okcancel":
            return 1 if messagebox.askokcancel(title, text, icon=icon) else 2
        elif type_ == "yesnocancel":
            res = messagebox.askyesnocancel(title, text, icon=icon)
            if res is True: return 6
            if res is False: return 7
            return 2
        elif type_ == "retrycancel":
            return 4 if messagebox.askretrycancel(title, text, icon=icon) else 2
        else:
            messagebox.showinfo(title, text, icon=icon)
            return 1

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
