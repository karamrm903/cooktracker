import React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";

const CameraOutlined = ({ color, ...props }: SvgProps) => (
  <Svg width={28} height={28} viewBox="0 0 28 28" fill="none" {...props}>
    <Path
      d="M16.905 5.059h-5.678L8.388 8.465H4.982a2.271 2.271 0 00-2.271 2.271v10.22a2.271 2.271 0 002.27 2.271h18.17a2.271 2.271 0 002.27-2.27v-10.22a2.271 2.271 0 00-2.27-2.272h-3.407L16.905 5.06z"
      stroke={color}
      strokeWidth={1.7033}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14.066 18.685a3.407 3.407 0 100-6.813 3.407 3.407 0 000 6.813z"
      stroke={color}
      strokeWidth={1.7033}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const SvgIcons = {
  CameraOutlined,
};

export default SvgIcons;
