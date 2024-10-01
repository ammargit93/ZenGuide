// utils.js
export const format_to_points = (text, use_numbers = false) => {
    // Split text into lines and clean up
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const formatted_points = [];
    let current_point = "";

    for (const line of lines) {
        // Check for numbered points
        if (/[1-9]\)/.test(line.charAt(0))) {  // Check for 1), 2), ... 9)
            if (current_point) {
                formatted_points.push(current_point.trim());
            }
            current_point = line;
        } else if (line.startsWith('-') || line.startsWith('*') || line.startsWith('<') || line.startsWith('#')) {
            if (current_point) {
                formatted_points.push(current_point.trim());
            }
            current_point = line.substring(1).trim();
        } else {
            current_point += " " + line.trim();
        }
    }

    if (current_point) {
        formatted_points.push(current_point.trim());
    }

    // Format the output based on whether to use numbers or not
    return use_numbers
        ? formatted_points.map((point, i) => `${i + 1}) ${point}`).join('\n')
        : formatted_points.map(point => `- ${point}`).join('\n');
};
