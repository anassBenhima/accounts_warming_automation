import { exiftool } from 'exiftool-vendored';
import path from 'path';

/**
 * Add realistic camera EXIF data to make the image look like it was taken with a real camera
 */
export async function addCameraExifData(imagePath: string): Promise<void> {
  try {
    const fullImagePath = path.join(process.cwd(), 'public', imagePath);

    // Randomize camera equipment
    const cameras = [
      { make: 'Canon', model: 'Canon EOS R5', lens: 'RF24-70mm F2.8 L IS USM' },
      { make: 'Canon', model: 'Canon EOS 5D Mark IV', lens: 'EF 50mm f/1.4 USM' },
      { make: 'Nikon', model: 'NIKON Z 7II', lens: 'NIKKOR Z 24-70mm f/2.8 S' },
      { make: 'Nikon', model: 'NIKON D850', lens: 'AF-S NIKKOR 85mm f/1.4G' },
      { make: 'Sony', model: 'ILCE-7RM4', lens: 'FE 24-70mm F2.8 GM' },
      { make: 'Sony', model: 'ILCE-7M4', lens: 'FE 50mm F1.8' },
      { make: 'Fujifilm', model: 'X-T4', lens: 'XF35mmF1.4 R' },
      { make: 'Olympus', model: 'E-M1 Mark III', lens: 'M.ZUIKO DIGITAL ED 12-40mm F2.8 PRO' },
    ];

    const camera = cameras[Math.floor(Math.random() * cameras.length)];

    // Generate realistic camera settings
    const isoValues = [100, 200, 400, 800, 1600, 3200];
    const apertureValues = ['1.4', '1.8', '2.8', '4.0', '5.6', '8.0'];
    const shutterSpeeds = ['1/125', '1/160', '1/200', '1/250', '1/320', '1/400', '1/500', '1/640'];
    const focalLengths = [24, 35, 50, 70, 85, 105];

    const iso = isoValues[Math.floor(Math.random() * isoValues.length)];
    const aperture = apertureValues[Math.floor(Math.random() * apertureValues.length)];
    const shutterSpeed = shutterSpeeds[Math.floor(Math.random() * shutterSpeeds.length)];
    const focalLength = focalLengths[Math.floor(Math.random() * focalLengths.length)];

    // Generate a realistic past date (within last 6 months)
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 180); // 0-180 days ago
    const captureDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Random time during daylight hours (8am - 6pm)
    const randomHour = 8 + Math.floor(Math.random() * 10);
    const randomMinute = Math.floor(Math.random() * 60);
    const randomSecond = Math.floor(Math.random() * 60);
    captureDate.setHours(randomHour, randomMinute, randomSecond);

    // Format date as EXIF format: "YYYY:MM:DD HH:mm:ss"
    const dateTimeOriginal = captureDate.toISOString()
      .replace('T', ' ')
      .replace(/\.\d{3}Z$/, '')
      .replace(/-/g, ':')
      .substring(0, 19);

    // Generate realistic GPS coordinates (major cities around the world)
    const locations = [
      { lat: 40.7128, lon: -74.006, city: 'New York' },      // New York
      { lat: 51.5074, lon: -0.1278, city: 'London' },        // London
      { lat: 48.8566, lon: 2.3522, city: 'Paris' },          // Paris
      { lat: 35.6762, lon: 139.6503, city: 'Tokyo' },        // Tokyo
      { lat: -33.8688, lon: 151.2093, city: 'Sydney' },      // Sydney
      { lat: 37.7749, lon: -122.4194, city: 'San Francisco' }, // San Francisco
      { lat: 52.52, lon: 13.405, city: 'Berlin' },           // Berlin
      { lat: 41.9028, lon: 12.4964, city: 'Rome' },          // Rome
      { lat: 34.0522, lon: -118.2437, city: 'Los Angeles' }, // LA
      { lat: 43.6532, lon: -79.3832, city: 'Toronto' },      // Toronto
    ];

    const location = locations[Math.floor(Math.random() * locations.length)];

    // Add slight randomization to coordinates (±0.01 degrees)
    const gpsLat = location.lat + (Math.random() - 0.5) * 0.02;
    const gpsLon = location.lon + (Math.random() - 0.5) * 0.02;

    // Convert to degrees, minutes, seconds format for GPS
    const latRef = gpsLat >= 0 ? 'N' : 'S';
    const lonRef = gpsLon >= 0 ? 'E' : 'W';

    // Write comprehensive camera EXIF data
    await exiftool.write(
      fullImagePath,
      {
        // Camera Information
        'EXIF:Make': camera.make,
        'EXIF:Model': camera.model,
        'EXIF:LensModel': camera.lens,
        'EXIF:LensMake': camera.make,

        // Camera Settings
        'EXIF:ISO': iso,
        'EXIF:FNumber': parseFloat(aperture),
        'EXIF:ExposureTime': shutterSpeed,
        'EXIF:FocalLength': focalLength,
        'EXIF:FocalLengthIn35mmFormat': Math.round(focalLength * 1.5), // Crop factor

        // Exposure Settings
        'EXIF:ExposureMode': 'Manual',
        'EXIF:ExposureProgram': 'Manual',
        'EXIF:MeteringMode': 'Multi-segment',
        'EXIF:WhiteBalance': 'Auto',
        'EXIF:Flash': 'No Flash',
        'EXIF:LightSource': 'Daylight',

        // Date/Time
        'EXIF:DateTimeOriginal': dateTimeOriginal,
        'EXIF:CreateDate': dateTimeOriginal,
        'EXIF:ModifyDate': dateTimeOriginal,

        // GPS Coordinates
        'EXIF:GPSLatitude': Math.abs(gpsLat),
        'EXIF:GPSLatitudeRef': latRef,
        'EXIF:GPSLongitude': Math.abs(gpsLon),
        'EXIF:GPSLongitudeRef': lonRef,
        'EXIF:GPSAltitude': Math.floor(Math.random() * 200) + 10, // 10-210 meters
        'EXIF:GPSAltitudeRef': 'Above Sea Level',

        // Image Settings
        'EXIF:ColorSpace': 'sRGB',
        'EXIF:ExifImageWidth': 1000,
        'EXIF:ExifImageHeight': 1500,
        'EXIF:ResolutionUnit': 'inches',
        'EXIF:XResolution': 72,
        'EXIF:YResolution': 72,
        'EXIF:Orientation': 'Horizontal (normal)',

        // Processing Software
        'EXIF:Software': `Adobe Photoshop Lightroom Classic 12.${Math.floor(Math.random() * 5)} (Windows)`,

        // Additional Technical Details
        'EXIF:Contrast': 'Normal',
        'EXIF:Saturation': 'Normal',
        'EXIF:Sharpness': 'Normal',
        'EXIF:SceneCaptureType': 'Standard',
        'EXIF:SubjectDistanceRange': 'Close',
      } as any,
      ['-overwrite_original']
    );

    console.log(`Successfully added camera EXIF data to ${imagePath} (${camera.make} ${camera.model})`);
  } catch (error) {
    console.error('Error adding camera EXIF data:', error);
    // Don't throw - EXIF writing is not critical
  }
}

/**
 * Add Pinterest-optimized metadata to an image
 */
export async function addPinterestMetadata(
  imagePath: string,
  metadata: { title: string; description: string; keywords: string[] }
): Promise<void> {
  try {
    const fullImagePath = path.join(process.cwd(), 'public', imagePath);

    // Write EXIF and IPTC metadata to the image
    await exiftool.write(
      fullImagePath,
      {
        // IPTC metadata (widely supported for images)
        'IPTC:ObjectName': metadata.title,
        'IPTC:Caption-Abstract': metadata.description,
        'IPTC:Keywords': metadata.keywords,

        // XMP metadata (modern standard, good for web)
        'XMP:Title': metadata.title,
        'XMP:Description': metadata.description,
        'XMP:Subject': metadata.keywords,

        // EXIF metadata
        'EXIF:ImageDescription': metadata.description,
        'EXIF:XPTitle': metadata.title,
        'EXIF:XPKeywords': metadata.keywords.join('; '),
        'EXIF:XPComment': metadata.description,
      } as any,
      ['-overwrite_original']
    );

    console.log(`Successfully wrote Pinterest metadata to ${imagePath}`);
  } catch (error) {
    console.error('Error writing Pinterest metadata to image:', error);
    // Don't throw - metadata writing is not critical
  }
}
