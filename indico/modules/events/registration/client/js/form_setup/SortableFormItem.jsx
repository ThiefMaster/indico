// This file is part of Indico.
// Copyright (C) 2002 - 2021 CERN
//
// Indico is free software; you can redistribute it and/or
// modify it under the terms of the MIT License; see the
// LICENSE file for more details.

import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch} from 'react-redux';

import {useSortableItem} from 'indico/react/sortable';

import FormItem from '../form/FormItem';

import * as actions from './actions';
import FormItemSetupActions from './FormItemSetupActions';

import '../../styles/regform.module.scss';

export default function SortableFormItem({index, sectionId, ...rest}) {
  const {id, inputType, isEnabled} = rest;
  const dispatch = useDispatch();
  const [handleRef, itemRef, style] = useSortableItem({
    type: `regform-item@${sectionId}`,
    id,
    index,
    separateHandle: true,
    active: isEnabled,
    itemData: {isStaticText: inputType === 'label'},
    moveItem: (sourceIndex, targetIndex) => {
      dispatch(actions.moveItem(sectionId, sourceIndex, targetIndex));
    },
    onDrop: item => {
      if (item.index !== item.originalIndex) {
        dispatch(
          actions.saveItemPosition(
            sectionId,
            item.id,
            item.index,
            item.originalIndex,
            item.isStaticText
          )
        );
      }
    },
  });

  return (
    <div ref={itemRef} style={style}>
      <FormItem
        sortHandle={<div styleName="sortable-handle" className="hide-if-locked" ref={handleRef} />}
        setupActions={<FormItemSetupActions {...rest} />}
        {...rest}
      />
    </div>
  );
}

const itemPropTypes = _.pick(
  FormItem.propTypes,
  'inputType',
  'isEnabled',
  ...Object.keys(FormItemSetupActions.propTypes)
);

SortableFormItem.propTypes = {
  sectionId: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  ...itemPropTypes,
};

SortableFormItem.defaultProps = _.pick(FormItem.defaultProps, Object.keys(itemPropTypes));
