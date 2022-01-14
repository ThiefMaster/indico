// This file is part of Indico.
// Copyright (C) 2002 - 2022 CERN
//
// Indico is free software; you can redistribute it and/or
// modify it under the terms of the MIT License; see the
// LICENSE file for more details.

import createDecorator from 'final-form-calculate';
import PropTypes from 'prop-types';
import TimePicker from 'rc-time-picker';
import React from 'react';
import {Field} from 'react-final-form';
import {Form} from 'semantic-ui-react';

import {SingleDatePicker} from 'indico/react/components';
import {FinalDropdown, FinalField, FinalInput, parsers as p} from 'indico/react/forms';
import {Translate} from 'indico/react/i18n';
import {toMoment} from 'indico/utils/date';

import '../../../styles/regform.module.scss';

function DateInputComponent({value, onChange, disabled, required, dateFormat, timeFormat}) {
  const dateValue = value.includes(' ') ? value.split(' ')[0] : value;
  const timeValue = value.includes(' ') ? value.split(/ (.*)/)[1] : '';
  const timeMomentFormat = timeFormat === '12h' ? 'hh:mm a' : 'HH:mm';
  const handleDateChange = newDate =>
    onChange(
      timeFormat ? `${newDate.format(dateFormat)} ${timeValue}` : newDate.format(dateFormat)
    );
  const handleTimeChange = newTime => onChange(`${dateValue} ${newTime.format(timeMomentFormat)}`);

  return (
    <Form.Group styleName="date-field">
      <Form.Field>
        <SingleDatePicker
          name="date"
          disabled={disabled}
          required={required}
          date={toMoment(dateValue, dateFormat, true)}
          onDateChange={handleDateChange}
          placeholder={dateFormat}
          displayFormat={dateFormat}
          isOutsideRange={() => false}
          verticalSpacing={10}
          enableOutsideDays
        />
      </Form.Field>
      {timeFormat && (
        <Form.Field>
          <TimePicker
            name="time"
            disabled={disabled}
            required={required}
            showSecond={false}
            value={toMoment(timeValue, timeMomentFormat, true)}
            focusOnOpen
            onChange={handleTimeChange}
            use12Hours={timeFormat === '12h'}
            allowEmpty={false}
            placeholder={timeFormat === '12h' ? '--:-- am/pm' : '--:--'}
            getPopupContainer={node => node}
          />
        </Form.Field>
      )}
    </Form.Group>
  );
}

DateInputComponent.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  required: PropTypes.bool.isRequired,
  dateFormat: PropTypes.oneOf([
    'DD/MM/YYYY',
    'DD.MM.YYYY',
    'MM/DD/YYYY',
    'MM.DD.YYYY',
    'YYYY/MM/DD',
    'YYYY.MM.DD',
    'MM/YYYY',
    'MM.YYYY',
    'YYYY',
  ]).isRequired,
  timeFormat: PropTypes.oneOf(['12h', '24h']),
};

DateInputComponent.defaultProps = {
  timeFormat: null,
};

export default function DateInput({htmlName, disabled, isRequired, dateFormat, timeFormat}) {
  const friendlyDateFormat = dateFormat.replace(
    /%([HMdmY])/g,
    (match, c) => ({H: 'HH', M: 'mm', d: 'DD', m: 'MM', Y: 'YYYY'}[c])
  );

  if (dateFormat.includes('%d')) {
    return (
      <FinalField
        name={htmlName}
        component={DateInputComponent}
        required={isRequired}
        disabled={disabled}
        dateFormat={friendlyDateFormat}
        timeFormat={timeFormat}
      />
    );
  } else {
    return (
      <FinalInput
        type="text"
        name={htmlName}
        disabled={disabled}
        placeholder={friendlyDateFormat}
      />
    );
  }
}

DateInput.propTypes = {
  htmlName: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  isRequired: PropTypes.bool,
  dateFormat: PropTypes.oneOf([
    '%d/%m/%Y',
    '%d.%m.%Y',
    '%m/%d/%Y',
    '%m.%d.%Y',
    '%Y/%m/%d',
    '%Y.%m.%d',
    '%m/%Y',
    '%m.%Y',
    '%Y',
  ]).isRequired,
  timeFormat: PropTypes.oneOf(['12h', '24h']),
};

DateInput.defaultProps = {
  disabled: false,
  isRequired: false,
  timeFormat: null,
};

export const dateSettingsFormDecorator = createDecorator({
  field: 'dateFormat',
  updates: dateFormat => {
    // clear the time format when it doesn't make sense for the selected date format
    if (!dateFormat.includes('%d')) {
      return {timeFormat: null};
    }
    return {};
  },
});

export const dateSettingsInitialData = {
  dateFormat: '%d/%m/%Y',
  timeFormat: null,
};

export function DateSettings() {
  const dateOptions = [
    '%d/%m/%Y',
    '%d.%m.%Y',
    '%m/%d/%Y',
    '%m.%d.%Y',
    '%Y/%m/%d',
    '%Y.%m.%d',
    '%m/%Y',
    '%m.%Y',
    '%Y',
  ].map(opt => ({
    key: opt,
    value: opt,
    text: opt.replace(
      /%([HMdmY])/g,
      (match, c) => ({H: 'hh', M: 'mm', d: 'DD', m: 'MM', Y: 'YYYY'}[c])
    ),
  }));
  const timeOptions = [
    {key: '12h', value: '12h', text: Translate.string('12 hours')},
    {key: '24h', value: '24h', text: Translate.string('24 hours')},
  ];
  return (
    <Form.Group widths="equal">
      <FinalDropdown
        name="dateFormat"
        label={Translate.string('Date format')}
        options={dateOptions}
        required
        selection
        fluid
      />
      <Field name="dateFormat" subscription={{value: true}}>
        {({input: {value: dateFormat}}) => (
          <FinalDropdown
            name="timeFormat"
            label={Translate.string('Time format')}
            options={timeOptions}
            placeholder={Translate.string('None')}
            disabled={!dateFormat.includes('%d')}
            parse={p.nullIfEmpty}
            selection
            fluid
          />
        )}
      </Field>
    </Form.Group>
  );
}
