import SvgIcons from "../../assets/svgs";

type IIconMapping = {
  [key in string]: React.JSX.ElementType;
};

export const SVG_ICONS = {
  CAMERA_ICON: "CameraIcon",
  MAINTAIN_WEIGHT_ICON: "MaintainWeightIcon",
  EDIT_PROFILE_ICON: "EditProfileIcon",
  SUBSCRIPTION_ICON: "SubscriptionIcon",
  PRIVACY_POLICY_ICON: "PrivacyPolicyIcon",
  TERMS_AND_CONDITION_ICON: "TermsAndConditionIcon",
  CONTACT_US_ICON: "ContactUsIcon",
  LANGUAGE_ICON: "LanguageIcon",
  CHEVRON_RIGHT_ICON: "ChevronRightIcon",
  LOGOUT_ICON: "LogoutIcon",
  LOOS_WEIGHT_ICON: "LooseWeightIcon",
  BUILD_MUSCLE_ICON: "BuildMuscleIcon",
  EAT_HEALTHY_ICON: "EatHealthyIcon",
  SEDENTARY_ICON: "SedentaryIcon",
  LIGHTLY_ACTIVE_ICON: "LightlyActiveIcon",
  BUILD_MUSCLE_ACTIVITY_ICON: "BuildMuscleActivityIcon",
  VERY_ACTIVE_ICON: "VeryActiveIcon",
};

export const SVG_ICON_COMPONENT_MAP: IIconMapping = {
  [SVG_ICONS.CAMERA_ICON]: SvgIcons.CameraIcon,
  [SVG_ICONS.MAINTAIN_WEIGHT_ICON]: SvgIcons.MaintainWeightIcon,
  [SVG_ICONS.EDIT_PROFILE_ICON]: SvgIcons.EditProfileIcon,
  [SVG_ICONS.SUBSCRIPTION_ICON]: SvgIcons.SubscriptionIcon,
  [SVG_ICONS.PRIVACY_POLICY_ICON]: SvgIcons.PrivacyPolicyIcon,
  [SVG_ICONS.TERMS_AND_CONDITION_ICON]: SvgIcons.TermsAndConditionIcon,
  [SVG_ICONS.CONTACT_US_ICON]: SvgIcons.ContactUsIcon,
  [SVG_ICONS.LANGUAGE_ICON]: SvgIcons.LanguageIcon,
  [SVG_ICONS.CHEVRON_RIGHT_ICON]: SvgIcons.ChevronRightIcon,
  [SVG_ICONS.LOGOUT_ICON]: SvgIcons.LogoutIcon,
  [SVG_ICONS.LOOS_WEIGHT_ICON]: SvgIcons.LooseWeightIcon,
  [SVG_ICONS.BUILD_MUSCLE_ICON]: SvgIcons.BuildMuscleIcon,
  [SVG_ICONS.EAT_HEALTHY_ICON]: SvgIcons.EatHealthyIcon,
  [SVG_ICONS.SEDENTARY_ICON]: SvgIcons.SedentaryIcon,
  [SVG_ICONS.LIGHTLY_ACTIVE_ICON]: SvgIcons.LightlyActiveIcon,
  [SVG_ICONS.BUILD_MUSCLE_ACTIVITY_ICON]: SvgIcons.BuildMuscleActivityIcon,
  [SVG_ICONS.VERY_ACTIVE_ICON]: SvgIcons.VeryActiveIcon,
};
