export function generateOTP(){
    return Math.floor(100000 + Math.random()*900000).toString();
}

 export const generateReferralCode = (firstName) => {
    const timestamp = Date.now().toString().slice(-4);
    const prefix = firstName.slice(0, 3).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${randomStr}${timestamp}`;
};


export const securePassword = async (password) => {
    try {
        const saltRound = Number(process.env.SALT_ROUND);
        const hashedPassword = await bcrypt.hash(password, saltRound);
        return hashedPassword;
    } catch (error) {
        console.log(error);
    }
};
export const EMAIL_SEND_TEMPLATE = (otp)=>`
        <div style="font-family: Joan, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto;">
          <h2 style="text-align: center; color:rgb(76, 91, 175);">Welcome to BLUR VINTAGE ⭐</h2>
          <p>Hello,</p>
          <p>Thank you for joining BLUR VINTAGE ⭐. Use the OTP below to verify your account:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; background-color: #f4f4f4; padding: 10px 20px; border-radius: 5px; color: #333;">${otp}</span>
          </div>
          <p>If you did not request this, please ignore this email.</p>
          <footer style="margin-top: 20px; text-align: center; color: #aaa; font-size: 12px;">
            © 2025 BLUR VINTAGE ⭐. All rights reserved.
          </footer>
        </div>
`;

export default  {
    generateOTP,
    generateReferralCode,
    securePassword,
    EMAIL_SEND_TEMPLATE,

}



