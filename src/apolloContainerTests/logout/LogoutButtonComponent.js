/**
 * Created by Andy Likuski on 2020.11.06
 * Copyright (c) 2020 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as chakra from '@chakra-ui/react';
import * as R from 'ramda';
import {composeViews, e, nameLookup, propsFor} from '@rescapes/helpers-component';
// the hook
import {useTranslation} from 'react-i18next';

import {defaultNode} from '@rescapes/ramda';
import {AuthenticationButton} from '../themeComponents/authenticationButton';

const {Button} = defaultNode(chakra);
export const c = nameLookup({
  logoutButton: true,
  logoutButtonBody: true,
  logoutButtonLoading: true,
  logoutButtonError: true
});

export default function LogoutButtonComponent(props) {
  const {t, i18n} = useTranslation();
  const allProps = LogoutButtonComponent.views(R.mergeRight(props, {history, location}));
  const propsOf = propsFor(allProps.views);
  return e(AuthenticationButton, propsOf(c.logoutButton), t('logout'));
}

LogoutButtonComponent.viewEventHandlers = props => {
  return {
    [c.logoutButton]: R.pick(['onClick'], props)
  };
};
LogoutButtonComponent.viewProps = props => {
  return {};
};
LogoutButtonComponent.viewStyles = props => {
  return {};
};

LogoutButtonComponent.views = composeViews(
  LogoutButtonComponent.viewEventHandlers,
  LogoutButtonComponent.viewProps,
  LogoutButtonComponent.viewStyles
);
