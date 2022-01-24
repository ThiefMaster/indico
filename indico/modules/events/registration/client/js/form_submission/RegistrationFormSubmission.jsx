// This file is part of Indico.
// Copyright (C) 2002 - 2022 CERN
//
// Indico is free software; you can redistribute it and/or
// modify it under the terms of the MIT License; see the
// LICENSE file for more details.

import _ from 'lodash';
import React from 'react';
import {Form as FinalForm} from 'react-final-form';
import {useSelector} from 'react-redux';

import {FinalSubmitButton, handleSubmitError} from 'indico/react/forms';
import {Translate} from 'indico/react/i18n';
import {indicoAxios} from 'indico/utils/axios';

import FormSection from '../form/FormSection';

import {getItems, getNestedSections, getUserInfo, getStaticData} from './selectors';

import '../../styles/regform.module.scss';

function getEmailNotificationSection(position) {
  return {
    id: 0,
    title: Translate.string('Email notification'),
    description: Translate.string(
      'Choose whether the user should be notified about the registration or not.'
    ),
    enabled: true,
    isManagerOnly: true,
    isPersonalData: false,
    items: [
      {
        id: 0,
        title: Translate.string('Send email'),
        description: '',
        isEnabled: true,
        htmlName: 'notify_user',
        inputType: 'bool',
        defaultValue: 'no',
        isPersonalData: false,
        position: 1,
      },
    ],
    position,
  };
}

export default function RegistrationFormSubmission() {
  const items = useSelector(getItems);
  const sections = useSelector(getNestedSections);
  const userInfo = useSelector(getUserInfo);
  const {submitUrl, management} = useSelector(getStaticData);

  const onSubmit = async data => {
    console.log(data);
    let resp;
    try {
      resp = await indicoAxios.post(submitUrl, data);
    } catch (err) {
      return handleSubmitError(err);
    }

    if (resp.data.redirect) {
      location.href = resp.data.redirect;
    }
  };

  const initialValues = Object.fromEntries(
    Object.entries(userInfo).filter(([key]) => {
      return Object.values(items).some(
        ({htmlName, fieldIsPersonalData, isEnabled}) =>
          htmlName === key && fieldIsPersonalData && isEnabled
      );
    })
  );

  if (management) {
    sections.push(getEmailNotificationSection(sections.length));
  }

  return (
    <FinalForm
      onSubmit={onSubmit}
      initialValues={initialValues}
      initialValuesEqual={_.isEqual}
      subscription={{}}
    >
      {fprops => (
        <form onSubmit={fprops.handleSubmit}>
          {sections.map(section => (
            <FormSection key={section.id} {...section} />
          ))}
          <FinalSubmitButton
            disabledUntilChange={false}
            disabledIfInvalid={false}
            // TODO: use different label when modifying registration
            label={Translate.string('Register')}
            style={{
              marginTop: 15,
              textAlign: 'center',
            }}
          />
        </form>
      )}
    </FinalForm>
  );
}
