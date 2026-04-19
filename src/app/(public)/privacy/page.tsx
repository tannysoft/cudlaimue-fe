import Link from "next/link";

export const metadata = {
  title: "นโยบายความเป็นส่วนตัว",
  description:
    "นโยบายความเป็นส่วนตัวของคัดลายมือ — อธิบายว่าเราเก็บข้อมูลอะไรเมื่อคุณสมัครสมาชิก สั่งซื้อ และใช้งานเว็บไซต์",
};

/**
 * Hard-coded privacy policy — edit this file directly to change wording.
 * Kept outside WordPress so it can't go missing if the WP install is
 * unreachable, and so we have full control over how cookies, LINE login,
 * Beam checkout, and the ebook watermark are disclosed.
 */
const LAST_UPDATED = "22 เมษายน 2569";

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose prose-cudlaimue">
      <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-teal-700 font-extrabold leading-tight">
        นโยบายความเป็นส่วนตัว
      </h1>
      <p className="text-sm text-ink/50 not-prose mt-2">
        อัปเดตล่าสุด: {LAST_UPDATED}
      </p>

      <p>
        &quot;คัดลายมือ&quot; (ต่อไปนี้เรียกว่า &quot;เรา&quot;) ให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งาน
        เว็บไซต์ <strong>cudlaimue.com</strong> (ต่อไปนี้เรียกว่า &quot;เว็บไซต์&quot;) และลูกค้าที่ซื้อสินค้าดิจิทัล
        (ฟอนต์ อีบุ๊ก เทมเพลต) กับเรา นโยบายนี้อธิบายว่าเราเก็บข้อมูลอะไร ใช้ทำอะไร เก็บไว้นานแค่ไหน
        และคุณมีสิทธิ์อะไรบ้าง เป็นไปตาม <strong>พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</strong>
      </p>

      <h2>1. ข้อมูลที่เราเก็บรวบรวม</h2>

      <h3>1.1 ข้อมูลบัญชีผู้ใช้</h3>
      <ul>
        <li>
          <strong>เข้าสู่ระบบด้วย LINE</strong> — เมื่อคุณล็อกอินด้วย LINE เราได้รับ LINE User ID,
          ชื่อที่แสดง (display name), และรูปโปรไฟล์ (หากคุณอนุญาต) จาก LINE Platform
          เราไม่ได้รับรหัสผ่าน LINE หรือข้อมูลเพื่อนของคุณ
        </li>
        <li>
          <strong>เข้าสู่ระบบด้วยอีเมล</strong> — เราเก็บอีเมล, ชื่อที่คุณระบุ, และ hash ของรหัสผ่าน
          (ไม่ใช่รหัสผ่านดิบ) เพื่อยืนยันตัวตนในการเข้าใช้งาน
        </li>
      </ul>

      <h3>1.2 ข้อมูลการสั่งซื้อและชำระเงิน</h3>
      <ul>
        <li>อีเมลสำหรับรับใบเสร็จ / ไฟล์ดาวน์โหลด</li>
        <li>เบอร์โทรศัพท์ (เพื่อยืนยันตัวตนและติดต่อหากมีปัญหา)</li>
        <li>อำเภอ/เขต และจังหวัด (สำหรับออกใบกำกับภาษีและวิเคราะห์การตลาดระดับพื้นที่)</li>
        <li>รายการสินค้าที่ซื้อ ยอดชำระ คูปองที่ใช้ และวันเวลา</li>
        <li>
          <strong>ข้อมูลบัตร/ธนาคาร — เราไม่เก็บ</strong> การชำระเงินทั้งหมดดำเนินการโดย{" "}
          <a
            href="https://www.beamcheckout.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Beam Checkout
          </a>
          {" "}ซึ่งเป็นผู้ให้บริการที่ได้รับการรับรองมาตรฐาน PCI-DSS เราได้รับเฉพาะ
          charge ID, สถานะการชำระ, และยอดรวมกลับมาเพื่อ update คำสั่งซื้อเท่านั้น
        </li>
      </ul>

      <h3>1.3 ข้อมูลการใช้งาน</h3>
      <ul>
        <li>
          IP address และ user-agent (เก็บใน log ของ Cloudflare Workers เพื่อความปลอดภัย
          และบันทึก download log)
        </li>
        <li>
          หน้าที่เปิด / รายการดาวน์โหลด / หน้าอีบุ๊กที่เปิดอ่าน — เพื่อช่วยตรวจสอบการใช้งานผิดปกติ
          และป้องกันการละเมิดลิขสิทธิ์
        </li>
        <li>
          <strong>ลายน้ำในอีบุ๊ก</strong> — ไฟล์อีบุ๊กทุกหน้าที่คุณเปิดจะถูกฝังหมายเลขคำสั่งซื้อของคุณ
          (10 หลักท้าย) เพื่อให้ตรวจสอบได้ว่าหากไฟล์รั่วไหลบนอินเทอร์เน็ต จะสามารถระบุต้นทางได้
          หมายเลขนี้ไม่เปิดเผยชื่อหรืออีเมลของคุณต่อบุคคลภายนอก
        </li>
      </ul>

      <h3>1.4 Cookies และเทคโนโลยีคล้ายกัน</h3>
      <p>เราแบ่ง cookies ออกเป็น 2 ประเภท:</p>

      <p><strong>ก. Cookies ที่จำเป็น (Strictly Necessary)</strong></p>
      <ul>
        <li>
          <code>cudlaimue_session</code> — session token สำหรับรักษาการล็อกอิน
          (HttpOnly, Secure, SameSite=Lax, อายุ 30 วัน)
        </li>
        <li>
          <code>localStorage</code> — เก็บตะกร้าสินค้าและคูปองที่ยังไม่ได้ checkout
          (ข้อมูลนี้อยู่ในเบราว์เซอร์ของคุณ ไม่ส่งมาที่เซิร์ฟเวอร์จนกว่าจะ checkout)
        </li>
        <li>
          <code>cudlaimue:cookie-ack</code> — บันทึกว่าคุณรับทราบแบนเนอร์ cookies แล้ว
          เพื่อไม่ต้องแสดงซ้ำ
        </li>
      </ul>

      <p><strong>ข. Cookies เพื่อการวิเคราะห์ (Analytics)</strong></p>
      <ul>
        <li>
          <strong>Google Analytics 4</strong> — ของ Google LLC
          ใช้เพื่อเข้าใจพฤติกรรมการใช้งาน เช่น หน้าที่ได้รับความนิยม
          อัตราการคลิกปุ่มซื้อ ช่องทางที่ผู้ใช้เข้ามา เพื่อปรับปรุงเนื้อหา
          และประสบการณ์การใช้งาน
        </li>
        <li>
          Cookies ที่ GA ใช้: <code>_ga</code>, <code>_ga_&lt;ID&gt;</code>{" "}
          (อายุประมาณ 2 ปี) เก็บ client ID แบบสุ่มที่ <strong>ไม่</strong>เชื่อมโยงกับตัวตนจริงของคุณ
        </li>
        <li>
          เราเปิด <strong>IP Anonymization</strong> — IP ถูก mask 1 byte สุดท้าย
          ก่อนส่งไปที่ Google, <strong>ไม่</strong>ได้ link กับ Google Ads หรือ Google Signals
        </li>
      </ul>

      <p><strong>ค. Cookies เพื่อการโฆษณา (Advertising / Retargeting)</strong></p>
      <ul>
        <li>
          <strong>Meta Pixel (Facebook/Instagram)</strong> — ของ Meta Platforms, Inc.
          ใช้ติดตามการเข้าชมหน้าสินค้าเพื่อแสดงโฆษณาที่เกี่ยวข้องใน Facebook/Instagram
          ในภายหลัง (retargeting) และวัดผล conversion จากแคมเปญโฆษณา
        </li>
        <li>
          <strong>TikTok Pixel</strong> — ของ TikTok Pte. Ltd.
          ใช้วัตถุประสงค์เดียวกับ Meta Pixel ใน TikTok Ads
        </li>
        <li>
          Cookies ที่ใช้: <code>_fbp</code>, <code>_fbc</code> (Meta, ~3 เดือน),
          {" "}<code>_ttp</code>, <code>_tt_enable_cookie</code> (TikTok, ~390 วัน)
          เก็บ pixel ID + browser ID แบบสุ่ม
        </li>
        <li>
          ข้อมูลที่ส่งไปคือ URL ที่เปิด, event (เช่น ViewContent, AddToCart, Purchase),
          ยอดและชื่อสินค้า, client ID แบบสุ่ม <strong>ไม่</strong>ส่งอีเมล ชื่อ หรือเบอร์
          โดยตรง (ถ้าเปิด Advanced Matching จะมีการ hash ด้วย SHA-256 ก่อน)
        </li>
        <li>
          คุณสามารถปฏิเสธโฆษณาแบบ personalized ได้ที่{" "}
          <a
            href="https://www.facebook.com/adpreferences/ad_settings"
            target="_blank"
            rel="noopener noreferrer"
          >
            Facebook Ad Preferences
          </a>
          {" / "}
          <a
            href="https://www.tiktok.com/safety/resources/ad-personalization"
            target="_blank"
            rel="noopener noreferrer"
          >
            TikTok Ad Personalization
          </a>
          {" หรือเลือกปฏิเสธในแบนเนอร์ cookies ด้านล่างของเว็บไซต์"}
        </li>
      </ul>

      <p>
        <strong>สิทธิในการปฏิเสธ (Opt-out)</strong> — Cookies ในกลุ่ม ข. และ ค.
        จะโหลดเฉพาะเมื่อคุณกด &quot;ยอมรับ&quot; ในแบนเนอร์ cookies คุณสามารถ
        เปลี่ยนใจได้ตลอดเวลาด้วยการล้างข้อมูล cookies ของเบราว์เซอร์ หรือติดตั้ง
        ส่วนเสริม{" "}
        <a
          href="https://tools.google.com/dlpage/gaoptout"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Analytics Opt-out
        </a>
      </p>

      <h2>2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
      <ul>
        <li>ประมวลผลคำสั่งซื้อ ส่งไฟล์ดาวน์โหลด และให้สิทธิ์เข้าถึงสินค้าดิจิทัลที่ซื้อ</li>
        <li>ยืนยันตัวตนและรักษาความปลอดภัยของบัญชี</li>
        <li>ออกใบเสร็จและใบกำกับภาษี (หากร้องขอ)</li>
        <li>ติดต่อสื่อสารเรื่องคำสั่งซื้อ การคืนเงิน หรือปัญหาทางเทคนิค</li>
        <li>ตรวจจับและป้องกันการใช้งานผิดปกติ การฉ้อโกง และการละเมิดลิขสิทธิ์</li>
        <li>ปฏิบัติตามข้อกำหนดทางกฎหมายและภาษี</li>
      </ul>

      <h2>3. การเปิดเผยข้อมูลแก่บุคคลที่สาม</h2>
      <p>เราเปิดเผยข้อมูลบางส่วนเฉพาะกับผู้ให้บริการที่จำเป็นต่อการดำเนินงาน ได้แก่:</p>
      <ul>
        <li>
          <strong>Cloudflare, Inc.</strong> — โฮสติ้ง, เก็บฐานข้อมูล (D1), จัดเก็บไฟล์ (R2),
          และ CDN เซิร์ฟเวอร์อาจตั้งอยู่นอกประเทศไทย
        </li>
        <li>
          <strong>LINE Corporation</strong> — เมื่อคุณล็อกอินด้วย LINE
        </li>
        <li>
          <strong>Beam Checkout (บริษัท บีม โซลูชั่นส์ จำกัด)</strong> — ผู้ประมวลผลการชำระเงิน
        </li>
        <li>
          <strong>Google LLC</strong> — Google Analytics 4 สำหรับวิเคราะห์ traffic
          ข้อมูลที่ส่งคือ client ID แบบสุ่ม, URL ที่เปิด, referrer, ประเภทอุปกรณ์
          และ IP ที่ถูก anonymize แล้ว ไม่รวมข้อมูลคำสั่งซื้อหรือข้อมูลส่วนบุคคลที่ระบุตัวตนได้
        </li>
        <li>
          <strong>Meta Platforms, Inc. (Facebook/Instagram)</strong> — Meta Pixel
          สำหรับ retargeting และวัดผลโฆษณา ส่ง event เช่น ViewContent, AddToCart,
          Purchase พร้อม pixel ID, browser ID, URL และข้อมูลสินค้า
        </li>
        <li>
          <strong>TikTok Pte. Ltd.</strong> — TikTok Pixel
          สำหรับ retargeting และวัดผลโฆษณาใน TikTok Ads
          ข้อมูลที่ส่งคล้ายกับ Meta Pixel
        </li>
      </ul>
      <p>
        เรา<strong>ไม่</strong>ขาย ไม่แลกเปลี่ยน และไม่ให้เช่าข้อมูลส่วนบุคคลของคุณแก่บุคคลที่สาม
        เพื่อวัตถุประสงค์ทางการตลาด ยกเว้นกรณีที่กฎหมายบังคับ (เช่น หมายศาล)
      </p>

      <h2>4. ระยะเวลาการเก็บข้อมูล</h2>
      <ul>
        <li>
          <strong>ข้อมูลบัญชีและคำสั่งซื้อ</strong> — เก็บตราบที่บัญชีของคุณยังใช้งาน
          และอย่างน้อย 10 ปีหลังจากการซื้อครั้งล่าสุด เพื่อเหตุผลทางบัญชี/ภาษีตามกฎหมายไทย
        </li>
        <li>
          <strong>Session logs</strong> — 30 วัน
        </li>
        <li>
          <strong>Download logs</strong> — 1 ปี สำหรับตรวจสอบการใช้งาน
        </li>
        <li>
          <strong>ไฟล์อีบุ๊กที่มีลายน้ำ (cache)</strong> — เก็บถาวรเพื่อให้คุณเปิดอ่านได้ตลอด
          ตราบที่บัญชีของคุณยังใช้งาน
        </li>
      </ul>

      <h2>5. สิทธิของเจ้าของข้อมูล (ตาม PDPA)</h2>
      <p>คุณมีสิทธิ์ดังต่อไปนี้:</p>
      <ul>
        <li>ขอเข้าถึง / ขอสำเนาข้อมูลส่วนบุคคลของคุณ</li>
        <li>ขอแก้ไขข้อมูลที่ไม่ถูกต้อง</li>
        <li>
          ขอลบบัญชีและข้อมูล (ยกเว้นข้อมูลที่เราต้องเก็บตามกฎหมายภาษี
          ซึ่งจะถูก anonymize แทน)
        </li>
        <li>ขอระงับการประมวลผลหรือคัดค้านการใช้ข้อมูล</li>
        <li>ขอโอนย้ายข้อมูล (data portability)</li>
        <li>ถอนความยินยอมที่ให้ไว้</li>
        <li>
          ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส./PDPC)
        </li>
      </ul>
      <p>
        หากต้องการใช้สิทธิ์ข้างต้น กรุณาติดต่อเราที่ช่องทางด้านล่าง
        เราจะตอบกลับภายใน 30 วัน
      </p>

      <h2>6. ความปลอดภัยของข้อมูล</h2>
      <ul>
        <li>ข้อมูลทั้งหมดส่งผ่านการเข้ารหัส HTTPS (TLS 1.2 หรือสูงกว่า)</li>
        <li>รหัสผ่านถูกเก็บเป็น hash ด้วยอัลกอริทึม bcrypt ไม่สามารถถอดกลับได้</li>
        <li>Session token เป็น HttpOnly cookie ป้องกัน XSS</li>
        <li>
          Webhook และ internal endpoints ป้องกันด้วย HMAC-SHA256 signature
        </li>
        <li>เข้าถึงฐานข้อมูลผ่าน Cloudflare bindings เท่านั้น ไม่เปิด DB ต่อ public internet</li>
      </ul>

      <h2>7. ข้อมูลของผู้เยาว์</h2>
      <p>
        เว็บไซต์ของเราไม่ได้ออกแบบสำหรับผู้ที่อายุต่ำกว่า 20 ปีโดยตรง
        หากคุณอายุต่ำกว่า 20 ปี กรุณาขอความยินยอมจากผู้ปกครองก่อนสมัครสมาชิกหรือซื้อสินค้า
      </p>

      <h2>8. การเปลี่ยนแปลงนโยบาย</h2>
      <p>
        เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว การเปลี่ยนแปลงจะมีผลทันทีเมื่อเผยแพร่บนหน้านี้
        กรณีเปลี่ยนแปลงสาระสำคัญ (เช่น เพิ่มผู้ให้บริการภายนอกใหม่) เราจะแจ้งผ่านอีเมล
        หรือแบนเนอร์บนเว็บไซต์ล่วงหน้าอย่างน้อย 7 วัน
      </p>

      <h2>9. ติดต่อเรา</h2>
      <p>หากมีคำถามเกี่ยวกับนโยบายนี้ หรือต้องการใช้สิทธิ์ตามข้อ 5 ติดต่อได้ที่:</p>
      <ul>
        <li>
          LINE Official:{" "}
          <a
            href="https://line.me/R/ti/p/@595tsawy"
            target="_blank"
            rel="noopener noreferrer"
          >
            @595tsawy
          </a>
        </li>
        <li>
          อีเมล:{" "}
          <a href="mailto:contact@cudlaimue.com">contact@cudlaimue.com</a>
        </li>
      </ul>

      <p className="text-sm text-ink/50 not-prose mt-8 pt-6 border-t border-peach-100">
        เอกสารที่เกี่ยวข้อง:{" "}
        <Link href="/license-agreement" className="text-peach-600 hover:underline">
          เงื่อนไขการใช้งานฟอนต์
        </Link>
        {" · "}
        <Link href="/refund-policy" className="text-peach-600 hover:underline">
          นโยบายการคืนเงิน
        </Link>
      </p>
    </article>
  );
}
