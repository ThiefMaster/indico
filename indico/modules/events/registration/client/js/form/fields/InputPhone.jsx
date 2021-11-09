// This file is part of Indico.
// Copyright (C) 2002 - 2021 CERN
//
// Indico is free software; you can redistribute it and/or
// modify it under the terms of the MIT License; see the
// LICENSE file for more details.

import PropTypes from 'prop-types';
import React from 'react';

export default function InputPhone({htmlName, disabled}) {
  return <input type="tel" name={htmlName} disabled={disabled} />;
}

InputPhone.propTypes = {
  htmlName: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

InputPhone.defaultProps = {
  disabled: false,
};
