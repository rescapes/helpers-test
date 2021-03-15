/**
 * Created by Andy Likuski on 2020.11.23
 * Copyright (c) 2020 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// theme.js
import * as chakraReact from '@chakra-ui/react';
// Global style overrides
import styles from "./styles";

// Foundational style overrides
import borderRadius from './foundations/borderRadius';
import borders from "./foundations/borders";
import breakpoints from './foundations/breakpoints';
import colors from './foundations/colors';
import fonts from './foundations/fonts';
import fontSizes from './foundations/fontSizes';
import fontWeights from './foundations/fontWeights';
import letterSpacings from './foundations/letterSpacings';
import lineHeights from './foundations/lineHeights';
import sizes from './foundations/sizes';
import space from './foundations/space';
import zIndices from './foundations/zIndices';
import {defaultNode} from '@rescapes/ramda';
// Component style overrides
import ExampleButtonConfig from './styleConfigs/exampleButtonConfig';
import ExampleMenuConfig from './styleConfigs/exampleMenuConfig';
import ExampleBadgeConfig from './styleConfigs/exampleBadgeConfig';
import AuthenticationBoxConfig from './styleConfigs/authenticationBoxConfig'
import AuthenticationButtonConfig from './styleConfigs/authenticationButtonConfig'
import AuthenticationInputConfig from './styleConfigs/authenticationInputConfig'

const {extendTheme} = defaultNode(chakraReact)

// TODO This should be the default Chakra theme
const theme = {};

// Override the default theme
const overrides = {
  borderRadius,
  breakpoints,
  borders,
  colors,
  fonts,
  fontSizes,
  fontWeights,
  letterSpacings,
  lineHeights,
  sizes: sizes(theme),
  space,
  styles,
  zIndices,
  // Other foundational style overrides go here
  components: {
    ExampleButton: ExampleBadgeConfig,
    ExampleMenu: ExampleMenuConfig,
    ExampleBadge: ExampleBadgeConfig,
    // Other components go here
    AuthenticationBox: AuthenticationBoxConfig,
    AuthenticationInput: AuthenticationInputConfig,
    AuthenticationButton: AuthenticationButtonConfig
  }
};

export default extendTheme(overrides);
