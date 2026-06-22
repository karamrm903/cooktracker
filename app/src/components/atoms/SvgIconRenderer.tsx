import React from "react";
import { SvgProps } from "react-native-svg";
import { SVG_ICON_COMPONENT_MAP } from "src/constants/svgIcons";

interface Props extends SvgProps {
  name: string;
}

const SvgIconRenderer = ({ name, ...props }: Props) => {
  const SvgIcon = SVG_ICON_COMPONENT_MAP[name];

  if (!SvgIcon) {
    return null;
  }

  return <SvgIcon {...props} />;
};

export { SvgIconRenderer };
