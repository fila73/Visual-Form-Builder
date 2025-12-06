export const VFPRuntimeCodePyQt = `
class VFPRuntime:
    @staticmethod
    def MessageBox(text, flags=0, title="Message"):
        """
        Mimics VFP MessageBox function using PyQt6 QMessageBox.
        Returns:
        1 = OK
        2 = Cancel
        3 = Abort
        4 = Retry
        5 = Ignore
        6 = Yes
        7 = No
        """
        # Icons
        icon = QMessageBox.Icon.Information
        if flags & 16: icon = QMessageBox.Icon.Critical      # Stop
        elif flags & 32: icon = QMessageBox.Icon.Question    # Question
        elif flags & 48: icon = QMessageBox.Icon.Warning     # Exclamation
        elif flags & 64: icon = QMessageBox.Icon.Information # Information
        
        # Buttons
        buttons = QMessageBox.StandardButton.Ok
        type_flag = flags % 16
        if type_flag == 1: buttons = QMessageBox.StandardButton.Ok | QMessageBox.StandardButton.Cancel
        elif type_flag == 2: buttons = QMessageBox.StandardButton.Abort | QMessageBox.StandardButton.Retry | QMessageBox.StandardButton.Ignore
        elif type_flag == 3: buttons = QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No | QMessageBox.StandardButton.Cancel
        elif type_flag == 4: buttons = QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        elif type_flag == 5: buttons = QMessageBox.StandardButton.Retry | QMessageBox.StandardButton.Cancel

        msg = QMessageBox()
        msg.setIcon(icon)
        msg.setWindowTitle(title)
        msg.setText(str(text))
        msg.setStandardButtons(buttons)
        
        ret = msg.exec()
        
        # Map return values
        if ret == QMessageBox.StandardButton.Ok: return 1
        if ret == QMessageBox.StandardButton.Cancel: return 2
        if ret == QMessageBox.StandardButton.Abort: return 3
        if ret == QMessageBox.StandardButton.Retry: return 4
        if ret == QMessageBox.StandardButton.Ignore: return 5
        if ret == QMessageBox.StandardButton.Yes: return 6
        if ret == QMessageBox.StandardButton.No: return 7
        return 0

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
