import LabelWidget from './LabelWidget';
import TextBoxWidget from './TextBoxWidget';
import EditBoxWidget from './EditBoxWidget';
import ButtonWidget from './ButtonWidget';
import CheckBoxWidget from './CheckBoxWidget';
import RadioWidget from './RadioWidget';
import SpinnerWidget from './SpinnerWidget';
import ComboBoxWidget from './ComboBoxWidget';
import GridWidget from './GridWidget';
import ShapeWidget from './ShapeWidget';
import ImageWidget from './ImageWidget';
import ContainerWidget from './ContainerWidget';

import PageFrameWidget from './PageFrameWidget';
import PageWidget from './PageWidget';

export const WIDGET_REGISTRY = {
    label: LabelWidget,
    textbox: TextBoxWidget,
    editbox: EditBoxWidget,
    button: ButtonWidget,
    checkbox: CheckBoxWidget,
    radio: RadioWidget,
    spinner: SpinnerWidget,
    combobox: ComboBoxWidget,
    grid: GridWidget,
    shape: ShapeWidget,
    image: ImageWidget,
    container: ContainerWidget,
    pageframe: PageFrameWidget,
    page: PageWidget
};
