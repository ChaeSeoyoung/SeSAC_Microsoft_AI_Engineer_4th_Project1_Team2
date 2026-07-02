export const getDistance = (lat1, lon1, lat2, lon2) => {

  const radLat1 = (Math.PI * lat1) / 180;
  const radLat2 = (Math.PI * lat2) / 180;

  const theta = lon1 - lon2;
  const radTheta = (Math.PI * theta) / 180;

  let dist =
    Math.sin(radLat1) * Math.sin(radLat2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.cos(radTheta);

  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;

  return Math.round(dist * 1609.344);
};