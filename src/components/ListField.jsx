import React from 'react';
import PropTypes from 'prop-types';
import Storage from './Storage';
import FieldConnect from './FieldConnect';
import FormContext from './FormContext';

export class ListField extends React.Component {
    static generateItemId() {
        return Math.random().toString(36).substring(7);
    }

    constructor(props) {
        super(props);
        this.state = {
            schema: props.context.getSchema(props.name),
            model: ListField.getModelFromProps(props),
            validationErrors: {},
        };

        this.storage = new Storage(this.state.model);
        this.setModel = this.setModel.bind(this);
        this.getModel = this.getModel.bind(this);
        this.getList = this.getList.bind(this);
        this.addListElement = this.addListElement.bind(this);
        this.removeListElement = this.removeListElement.bind(this);
        this.getSchema = this.getSchema.bind(this);
        this.getValidationErrors = this.getValidationErrors.bind(this);
        this.setStateModel = this.setStateModel.bind(this);
    }

    componentWillMount() {
        this.storage.listen(this.setStateModel);
    }

    componentWillReceiveProps({ value }) {
        let shouldSetState = false;
        value.forEach((item, key) => {
            if (item !== this.state.model[key].value) shouldSetState = true;
        });
        if (shouldSetState) this.storage.setModel(ListField.getModelFromProps({ value }));
    }

    componentWillUnmount() {
        this.storage.unlisten(this.setStateModel);
    }

    getContext() {
        return this.props.context;
    }

    getProviderContext() {
        return {
            setModel: this.setModel,
            getModel: this.getModel,
            getSchema: this.getSchema,
            getValidationErrors: this.getValidationErrors,
        };
    }

    static getModelFromProps(props) {
        if (props.value.length > 0) {
            return props.value.map(item => ({
                id: ListField.generateItemId(),
                value: item,
            }));
        }
        return [];
    }

    setStateModel(model, callback) {
        this.setState({ model }, callback);
        this.props.onChange(model.map(item => item.value));
    }

    setModel(name, value, callback) {
        const key = name.split('-')[1];
        const model = Array.from(this.state.model);
        model[parseInt(key, 10)].value = value;
        this.storage.setModel(model, callback);
    }

    getModel(name) {
        const key = name.split('-')[1];
        return this.state.model[key].value;
    }

    getSchema() {
        return this.state.schema;
    }

    getValidationErrors(name) {
        const [fieldName, key] = name.split('-');
        const { getValidationErrors } = this.getContext();
        const validationErrors = getValidationErrors(fieldName);
        return validationErrors[parseInt(key, 10)] || [];
    }

    getDefaultValueForListItem() {
        if (
            this.state.schema &&
            this.state.schema.type &&
            this.state.schema.type[0] &&
            typeof this.state.schema.type[0] === 'object' &&
            typeof this.state.schema.type[0].getDefaultValues === 'function'
        ) {
            return this.state.schema.type[0].getDefaultValues();
        }
        return undefined;
    }

    getList(children) {
        const {
            name,
            removeButton: {
                wrapperClassName,
                className,
                value,
            },
            hideRemoveButton,
            itemWrapperClassName,
        } = this.props;

        const isRemoveAllowed = this.isRemoveAllowed();

        return this.state.model.map((item, key) => {
            const removeItemAction = () => this.removeListElement(key);
            const child = React.cloneElement(children, {
                name: `${name}-${key}`,
                index: key,
                value: item.value,
                key: item.id,
                removeListElement: removeItemAction,
            });

            return (
                <div key={item.id} className={itemWrapperClassName}>
                    {child}
                    {!hideRemoveButton && isRemoveAllowed && <div className={wrapperClassName}>
                        <button
                            onClick={removeItemAction}
                            className={className}
                        >
                            {value || 'Remove'}
                        </button>
                    </div>}
                </div>
            );
        });
    }

    isAddAllowed() {
        const { maxLength } = this.props;
        const { model } = this.state;
        if (typeof maxLength === 'number') return model.length < maxLength;
        return true;
    }

    isRemoveAllowed() {
        const { minLength } = this.props;
        const { model } = this.state;
        if (typeof minLength === 'number') return model.length > minLength;
        return true;
    }

    addListElement() {
        const model = Array.from(this.state.model);
        model.push({
            id: ListField.generateItemId(),
            value: this.getDefaultValueForListItem(),
        });
        this.setState({ model });
    }

    removeListElement(key) {
        const model = Array.from(this.state.model);
        model.splice(key, 1);
        this.setState({ model });
        this.props.onChange(model.map(item => item.value));
    }

    render() {
        const {
            context,
            children,
            className,
            wrapperClassName,
            label,
            addButton,
            hideAddButton,
            fieldAttributes,
            name,
        } = this.props;

        const isAddAllowed = this.isAddAllowed();

        return (
            <FormContext.Provider value={{ ...context, ...this.getProviderContext() }}>
                <div className={wrapperClassName}>
                    {label && <label htmlFor={name}>{label}</label>}
                    <div className={className} {...fieldAttributes}>{this.getList(children)}</div>
                    {!hideAddButton && isAddAllowed && <button
                        onClick={this.addListElement}
                        className={addButton.className}
                    >
                        {addButton.value || 'Add'}
                    </button>}
                </div>
            </FormContext.Provider>
        );
    }
}

ListField.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    wrapperClassName: PropTypes.string,
    itemWrapperClassName: PropTypes.string,
    label: PropTypes.string,
    addButton: PropTypes.shape({
        className: PropTypes.string,
        value: PropTypes.node,
    }),
    removeButton: PropTypes.shape({
        wrapperClassName: PropTypes.string,
        className: PropTypes.string,
        value: PropTypes.node,
    }),
    hideAddButton: PropTypes.bool,
    hideRemoveButton: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    name: PropTypes.string,
    value: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.shape({}),
            PropTypes.string,
            PropTypes.number,
        ]),
    ),
    fieldAttributes: PropTypes.shape({}),
    minLength: PropTypes.number,
    maxLength: PropTypes.number,
    context: PropTypes.shape({
        getSchema: PropTypes.func,
    }),
};

ListField.defaultProps = {
    children: '',
    className: '',
    wrapperClassName: '',
    itemWrapperClassName: '',
    label: '',
    addButton: {},
    removeButton: {},
    hideAddButton: false,
    hideRemoveButton: false,
    name: '',
    value: [],
    fieldAttributes: {},
    minLength: undefined,
    maxLength: undefined,
    context: {
        getSchema: () => {},
    },
};

export default FieldConnect(ListField);
