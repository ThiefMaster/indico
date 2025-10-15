// This file is part of Indico.
// Copyright (C) 2002 - 2025 CERN
//
// Indico is free software; you can redistribute it and/or
// modify it under the terms of the MIT License; see the
// LICENSE file for more details.

import createDecorator from 'final-form-calculate';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, {useEffect, useMemo} from 'react';
import {Field, useFormState} from 'react-final-form';
import {useSelector} from 'react-redux';
import {Form, Label} from 'semantic-ui-react';

import {RadioButton, Select} from 'indico/react/components';
import {FinalCheckbox, FinalDropdown, FinalField, parsers as p} from 'indico/react/forms';
import {Param, PluralTranslate, Translate} from 'indico/react/i18n';

import {getPriceFormatter} from '../../form/selectors';
import {getFieldValue, getManagement, getPaid} from '../../form_submission/selectors';

import ChoiceLabel from './ChoiceLabel';
import {Choices, choiceShape} from './ChoicesSetup';
import {PlacesLeft} from './PlacesLeftLabel';

import '../../../styles/regform.module.scss';
import './table.module.scss';

function useAccompanyingPersonsCount() {
  const items = useSelector(state => state.items);
  const formState = useFormState();
  const hasAccompanyingFields = useMemo(
    () => !!Object.values(items).filter(f => f.inputType === 'accompanying_persons').length,
    [items]
  );
  const accompanyingPersons = useMemo(
    () =>
      hasAccompanyingFields
        ? _.flatten(
            Object.values(items)
              .filter(f => f.inputType === 'accompanying_persons')
              .map(f => formState.values[f.htmlName])
          )
        : 0,
    [hasAccompanyingFields, formState, items]
  );
  return accompanyingPersons.length;
}

function SingleChoiceDropdown({
  id,
  existingValue,
  value,
  onChange,
  onFocus,
  onBlur,
  disabled,
  isRequired,
  isPurged,
  choices,
  withExtraSlots,
  placesUsed,
  numAccompanyingSlots,
  setValidationError,
}) {
  const paid = useSelector(getPaid);
  const management = useSelector(getManagement);
  const formatPrice = useSelector(getPriceFormatter);
  const selectedChoice = useMemo(() => choices.find(c => c.id in value) || {}, [choices, value]);
  const selectedSeats = value[selectedChoice.id] || 0;

  const isPaidChoice = choice => choice.price > 0 && paid;
  const isPaidChoiceLocked = choice => !management && isPaidChoice(choice);

  let extraSlotsDropdown = null;
  const extraSlotsLabelId = `${id}-label`;
  const shouldShowExtraSlots = withExtraSlots && selectedChoice && selectedChoice.maxExtraSlots > 0;
  const shouldShowExtraSlotsLabel = shouldShowExtraSlots && !!selectedChoice.price;

  const overLimit =
    shouldShowExtraSlots &&
    numAccompanyingSlots !== null &&
    !!selectedChoice?.placesLimit &&
    (placesUsed[selectedChoice.id] || 0) -
      (existingValue[selectedChoice.id] || 0) +
      numAccompanyingSlots >=
      selectedChoice.placesLimit;

  useEffect(() => {
    setValidationError(
      overLimit
        ? PluralTranslate.string(
            'There are not enough places left to fit you and your accompanying person.',
            'There are not enough places left to fit you and your accompanying persons.',
            numAccompanyingSlots
          )
        : undefined
    );
  }, [overLimit, numAccompanyingSlots, setValidationError]);

  if (shouldShowExtraSlots) {
    const slotValues = _.range(1, selectedChoice.maxExtraSlots + 2);
    const options = slotValues.map(i => ({
      value: i,
      disabled:
        selectedChoice.placesLimit > 0 &&
        (placesUsed[selectedChoice.id] || 0) - (existingValue[selectedChoice.id] || 0) + i >
          selectedChoice.placesLimit,
    }));
    const comboBoxExtraProps = {};
    if (shouldShowExtraSlotsLabel) {
      comboBoxExtraProps['aria-describedby'] = extraSlotsLabelId;
    }
    extraSlotsDropdown = (
      <label>
        <span styleName="extra-slots-label">
          <Translate>Extra slots</Translate>
        </span>
        <Select
          id={id ? `${id}-extraslots` : ''}
          options={options}
          disabled={
            disabled ||
            numAccompanyingSlots !== null ||
            isPaidChoiceLocked(selectedChoice) ||
            (selectedChoice.placesLimit > 0 &&
              (placesUsed[selectedChoice.id] || 0) - (existingValue[selectedChoice.id] || 0) >=
                selectedChoice.placesLimit)
          }
          value={String(selectedSeats)}
          onChange={evt => {
            const selectedSlots = Number(evt.target.value);
            onChange({[selectedChoice.id]: selectedSlots});
          }}
          required
          {...comboBoxExtraProps}
        />
      </label>
    );
  }

  const options = choices.map(choice => ({
    value: choice.id,
    label: (
      <div styleName="dropdown-text" key={choice.id}>
        <div styleName="caption" data-label>
          <ChoiceLabel choice={choice} management={management} paid={isPaidChoice(choice)} />
        </div>
        <div styleName="labels">
          {!!choice.price && <Label>{formatPrice(choice.price)}</Label>}
          {choice.placesLimit === 0 ? null : (
            <PlacesLeft
              placesLimit={choice.placesLimit}
              placesUsed={placesUsed[choice.id] || 0}
              isEnabled={choice.isEnabled}
            />
          )}
        </div>
      </div>
    ),
    disabled:
      !choice.isEnabled ||
      isPaidChoiceLocked(choice) ||
      (choice.placesLimit > 0 &&
        (placesUsed[choice.id] || 0) >= choice.placesLimit &&
        !existingValue[choice.id]),
  }));

  const handleChange = evt => {
    if (!evt.target.value) {
      onChange({});
      return;
    }
    onChange({[evt.target.value]: 1 + numAccompanyingSlots});
  };

  return (
    <Form.Group styleName="single-choice-dropdown">
      <Form.Field error={overLimit}>
        <Select
          id={id}
          onChange={handleChange}
          options={options}
          value={(!isPurged && selectedChoice.id) || ''}
          required={isRequired}
          disabled={disabled}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </Form.Field>
      <div styleName="extra-slots">
        {extraSlotsDropdown}
        {shouldShowExtraSlotsLabel && (
          <Label pointing="left" id={extraSlotsLabelId}>
            <Translate>
              Total:{' '}
              <Param
                name="price"
                value={formatPrice(
                  (selectedChoice.extraSlotsPay ? selectedSeats : 1) * selectedChoice.price
                )}
              />
            </Translate>
          </Label>
        )}
      </div>
    </Form.Group>
  );
}

SingleChoiceDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  isRequired: PropTypes.bool.isRequired,
  isPurged: PropTypes.bool.isRequired,
  choices: PropTypes.arrayOf(PropTypes.shape(choiceShape)).isRequired,
  withExtraSlots: PropTypes.bool.isRequired,
  placesUsed: PropTypes.objectOf(PropTypes.number).isRequired,
  existingValue: PropTypes.objectOf(PropTypes.number).isRequired,
  numAccompanyingSlots: PropTypes.number,
  setValidationError: PropTypes.func.isRequired,
};

function SingleChoiceRadioGroup({
  id,
  existingValue,
  value,
  onChange,
  disabled,
  isRequired,
  isPurged,
  choices,
  withExtraSlots,
  placesUsed,
  numAccompanyingSlots,
  setValidationError,
}) {
  const paid = useSelector(getPaid);
  const management = useSelector(getManagement);
  const formatPrice = useSelector(getPriceFormatter);
  const selectedChoice = useMemo(
    () => choices.find(c => c.id in value) || {id: ''},
    [choices, value]
  );
  const selectedSeats = value[selectedChoice.id] || 0;
  const radioChoices = [...choices];
  if (!isRequired) {
    radioChoices.unshift({id: '', isEnabled: true, caption: Translate.string('None', 'Choice')});
  }

  const overLimit =
    withExtraSlots &&
    numAccompanyingSlots !== null &&
    !!selectedChoice?.placesLimit &&
    (placesUsed[selectedChoice.id] || 0) -
      (existingValue[selectedChoice.id] || 0) +
      numAccompanyingSlots >=
      selectedChoice.placesLimit;

  const overLimitError = overLimit
    ? PluralTranslate.string(
        'There are not enough places left to fit you and your accompanying person.',
        'There are not enough places left to fit you and your accompanying persons.',
        numAccompanyingSlots
      )
    : undefined;

  useEffect(() => {
    setValidationError(overLimitError);
  }, [overLimitError, setValidationError]);

  const handleChange = newValue => {
    if (newValue === '') {
      onChange({});
    } else {
      onChange({[newValue]: 1 + numAccompanyingSlots});
    }
  };

  const isChecked = currentChoice => currentChoice.id === selectedChoice.id;

  const isPaidChoice = choice => choice.price > 0 && paid;
  const isPaidChoiceLocked = choice => !management && isPaidChoice(choice);

  return (
    <table styleName="choice-table" role="presentation">
      <tbody>
        {radioChoices.map((c, index) => {
          return (
            <tr key={c.id} styleName="row">
              <td>
                <RadioButton
                  id={id ? `${id}-${index}` : ''}
                  name={id}
                  label={
                    <ChoiceLabel
                      choice={c}
                      management={management}
                      paid={isPaidChoice(c)}
                      customWarning={!isPurged && isChecked(c) ? overLimitError : undefined}
                    />
                  }
                  key={c.id}
                  value={c.id}
                  disabled={
                    !c.isEnabled ||
                    disabled ||
                    isPaidChoiceLocked(c) ||
                    (c.placesLimit > 0 &&
                      (placesUsed[c.id] || 0) - (existingValue[c.id] || 0) >= c.placesLimit)
                  }
                  checked={!isPurged && isChecked(c)}
                  onChange={() => handleChange(c.id)}
                />
              </td>
              <td>
                {c.isEnabled && !!c.price && (
                  <Label pointing="left" styleName={isPurged || !isChecked(c) ? 'greyed' : ''}>
                    {formatPrice(c.price)}
                  </Label>
                )}
              </td>
              <td>
                {c.id !== '' && c.placesLimit !== 0 && (
                  <PlacesLeft
                    placesLimit={c.placesLimit}
                    placesUsed={placesUsed[c.id] || 0}
                    isEnabled={!disabled && c.isEnabled && !isPaidChoiceLocked(c)}
                  />
                )}
              </td>
              {withExtraSlots && !!c.maxExtraSlots && selectedChoice.id === c.id && (
                <>
                  <td>
                    {c.isEnabled && (
                      <label>
                        <span styleName="extra-slots-label">
                          <Translate>Extra slots</Translate>
                        </span>
                        <Select
                          id={id ? `${id}-extraslot` : ''}
                          selection
                          styleName="dropdown"
                          disabled={
                            disabled ||
                            numAccompanyingSlots !== null ||
                            isPaidChoiceLocked(c) ||
                            (c.placesLimit > 0 &&
                              (placesUsed[c.id] || 0) - (existingValue[c.id] || 0) >= c.placesLimit)
                          }
                          value={String(selectedSeats)}
                          onChange={evt => onChange({[selectedChoice.id]: evt.target.value})}
                          options={_.range(1, c.maxExtraSlots + 2).map(i => ({
                            value: i,
                            disabled:
                              selectedChoice.placesLimit > 0 &&
                              (placesUsed[selectedChoice.id] || 0) -
                                (existingValue[selectedChoice.id] || 0) +
                                i >
                                selectedChoice.placesLimit,
                          }))}
                          required
                        />
                      </label>
                    )}
                  </td>
                  <td>
                    {c.isEnabled && !!c.price && (
                      <Label pointing="left">
                        <Translate>
                          Total:{' '}
                          <Param
                            name="price"
                            value={formatPrice(
                              (selectedChoice.extraSlotsPay ? selectedSeats : 1) * c.price
                            )}
                          />
                        </Translate>
                      </Label>
                    )}
                  </td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

SingleChoiceRadioGroup.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  isRequired: PropTypes.bool.isRequired,
  isPurged: PropTypes.bool.isRequired,
  choices: PropTypes.arrayOf(PropTypes.shape(choiceShape)).isRequired,
  withExtraSlots: PropTypes.bool.isRequired,
  placesUsed: PropTypes.objectOf(PropTypes.number).isRequired,
  existingValue: PropTypes.objectOf(PropTypes.number).isRequired,
  numAccompanyingSlots: PropTypes.number,
  setValidationError: PropTypes.func.isRequired,
};

function SingleChoiceInputComponent({
  id,
  name,
  existingValue,
  value,
  onChange,
  onFocus,
  onBlur,
  disabled,
  isRequired,
  isPurged,
  itemType,
  choices,
  withExtraSlots,
  accompanyingUseSlots,
  placesUsed,
}) {
  const numAccompanying = useAccompanyingPersonsCount(accompanyingUseSlots);
  const numAccompanyingSlots = accompanyingUseSlots ? numAccompanying : null;

  useEffect(() => {
    if (!accompanyingUseSlots || !Object.keys(value).length) {
      return;
    }
    const newValue = Object.fromEntries(Object.keys(value).map(k => [k, numAccompanying + 1]));
    if (!_.isEqual(value, newValue)) {
      onChange(newValue);
    }
  }, [onChange, value, accompanyingUseSlots, numAccompanying]);

  let component = null;
  if (itemType === 'dropdown') {
    component = setValidationError => (
      <SingleChoiceDropdown
        id={id}
        value={value}
        existingValue={existingValue}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        isRequired={isRequired}
        isPurged={isPurged}
        choices={choices}
        withExtraSlots={withExtraSlots}
        placesUsed={placesUsed}
        numAccompanyingSlots={numAccompanyingSlots}
        setValidationError={setValidationError}
      />
    );
  } else if (itemType === 'radiogroup') {
    component = setValidationError => (
      <SingleChoiceRadioGroup
        id={id}
        value={value}
        existingValue={existingValue}
        onChange={onChange}
        disabled={disabled}
        isRequired={isRequired}
        isPurged={isPurged}
        choices={choices}
        withExtraSlots={withExtraSlots}
        placesUsed={placesUsed}
        numAccompanyingSlots={numAccompanyingSlots}
        setValidationError={setValidationError}
      />
    );
  } else {
    return `ERROR: Unknown type ${itemType}`;
  }

  return (
    <Field
      name={`_${name}_invalidator`}
      validate={v => v || undefined}
      render={({input: {onChange: setValidationError}}) => component(setValidationError)}
    />
  );
}

SingleChoiceInputComponent.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  isRequired: PropTypes.bool.isRequired,
  isPurged: PropTypes.bool.isRequired,
  itemType: PropTypes.oneOf(['dropdown', 'radiogroup']).isRequired,
  choices: PropTypes.arrayOf(PropTypes.shape(choiceShape)).isRequired,
  withExtraSlots: PropTypes.bool.isRequired,
  accompanyingUseSlots: PropTypes.bool.isRequired,
  placesUsed: PropTypes.objectOf(PropTypes.number).isRequired,
  existingValue: PropTypes.objectOf(PropTypes.number).isRequired,
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
};

export default function SingleChoiceInput({
  fieldId,
  htmlId,
  htmlName,
  disabled,
  isRequired,
  isPurged,
  itemType,
  choices,
  withExtraSlots,
  accompanyingUseSlots,
  placesUsed,
}) {
  const existingValue = useSelector(state => getFieldValue(state, fieldId)) || {};

  function validate(value) {
    const noValue = !value || !Object.keys(value).length;
    if (isRequired && noValue) {
      return Translate.string('This field is required');
    }

    if (noValue) {
      // When there is no value but the field is not required, it's a pass
      return;
    }
  }

  return (
    <FinalField
      id={htmlId}
      name={htmlName}
      component={SingleChoiceInputComponent}
      format={v => v || {}}
      required={isRequired}
      isRequired={isRequired}
      validate={validate}
      disabled={disabled}
      isPurged={isPurged}
      itemType={itemType}
      choices={choices}
      withExtraSlots={withExtraSlots}
      accompanyingUseSlots={accompanyingUseSlots}
      placesUsed={placesUsed}
      existingValue={existingValue}
      isEqual={_.isEqual}
    />
  );
}

SingleChoiceInput.propTypes = {
  fieldId: PropTypes.number.isRequired,
  htmlId: PropTypes.string.isRequired,
  htmlName: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  isRequired: PropTypes.bool,
  isPurged: PropTypes.bool.isRequired,
  itemType: PropTypes.oneOf(['dropdown', 'radiogroup']).isRequired,
  choices: PropTypes.arrayOf(PropTypes.shape(choiceShape)).isRequired,
  withExtraSlots: PropTypes.bool,
  accompanyingUseSlots: PropTypes.bool,
  placesUsed: PropTypes.objectOf(PropTypes.number).isRequired,
};

SingleChoiceInput.defaultProps = {
  disabled: false,
  isRequired: false,
  withExtraSlots: false,
  accompanyingUseSlots: false,
};

export const singleChoiceSettingsFormDecorator = createDecorator({
  field: 'choices',
  updates: (choices, __, {defaultItem}) => {
    // clear the default item when it's removed from the choices or disabled
    if (!choices.some(c => c.id === defaultItem && c.isEnabled)) {
      return {defaultItem: null};
    }
    return {};
  },
});

export const singleChoiceSettingsInitialData = {
  choices: [],
  itemType: 'dropdown',
  defaultItem: null,
  withExtraSlots: false,
  accompanyingUseSlots: false,
};

export function SingleChoiceSettings() {
  return (
    <>
      <FinalDropdown
        name="itemType"
        label={Translate.string('Widget type')}
        options={[
          {key: 'dropdown', value: 'dropdown', text: Translate.string('Drop-down list')},
          {key: 'radiogroup', value: 'radiogroup', text: Translate.string('Radio buttons')},
        ]}
        selection
        required
      />
      <Field name="choices" subscription={{value: true}} isEqual={_.isEqual}>
        {({input: {value: choices}}) => (
          <FinalDropdown
            name="defaultItem"
            label={Translate.string('Default option')}
            options={choices
              .filter(c => c.isEnabled)
              .map(c => ({key: c.id, value: c.id, text: c.caption}))}
            disabled={!choices.some(c => c.isEnabled)}
            parse={p.nullIfEmpty}
            selection
          />
        )}
      </Field>
      <FinalCheckbox name="withExtraSlots" label={Translate.string('Enable extra slots')} />
      <FinalCheckbox
        name="accompanyingUseSlots"
        label={Translate.string('Accompanying persons use slots')}
      />
      <Field name="withExtraSlots" subscription={{value: true}}>
        {({input: {value: withExtraSlots}}) => (
          <FinalField
            name="choices"
            label={Translate.string('Choices')}
            component={Choices}
            withExtraSlots={withExtraSlots}
            isEqual={_.isEqual}
            required
          />
        )}
      </Field>
    </>
  );
}

export function singleChoiceShowIfOptions(field) {
  return field.choices.map(({caption, id}) => ({value: id, text: caption}));
}

export function singleChoiceGetDataForCondition(value) {
  return Object.entries(value)
    .filter(([, slots]) => slots > 0)
    .map(([key]) => key);
}
