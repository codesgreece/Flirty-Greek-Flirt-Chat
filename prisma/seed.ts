import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PrismaClient, Gender, DatingIntention, VibeCode, PlanCode } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { dailyVibeFor } from "../src/lib/daily-vibe";

const prisma = new PrismaClient();

const PASSWORD = "FlirtyDev!234";
const ADMIN_PASSWORD = "FlirtyAdmin!234";

const INTERESTS = [
  ["music", "Music"],
  ["film", "Film"],
  ["food", "Food"],
  ["travel", "Travel"],
  ["fitness", "Fitness"],
  ["art", "Art"],
  ["books", "Books"],
  ["nightlife", "Nightlife"],
  ["outdoors", "Outdoors"],
  ["tech", "Tech"],
  ["wine", "Wine"],
  ["dogs", "Dogs"],
  ["cats", "Cats"],
  ["yoga", "Yoga"],
  ["sea", "The sea"],
];

const VIBES: Array<[VibeCode, string]> = [
  ["CHILL", "Chill"],
  ["ROMANTIC", "Romantic"],
  ["ADVENTUROUS", "Adventurous"],
  ["FUNNY", "Funny"],
  ["SOCIAL", "Social"],
  ["DEEP", "Deep"],
  ["CREATIVE", "Creative"],
  ["AMBITIOUS", "Ambitious"],
  ["SPONTANEOUS", "Spontaneous"],
];

const PEOPLE = [
  { email: "elena@flirty.local", name: "Elena", gender: "WOMAN" as Gender, seeking: ["MAN"] as Gender[], city: "Athens", lat: 37.9838, lng: 23.7275, dob: "1996-04-12", intention: "RELATIONSHIP" as DatingIntention, vibes: ["ROMANTIC", "CHILL"] as VibeCode[], interests: ["music", "sea", "food"], bio: "Slow mornings, late dinners, and someone who means it.", colors: ["#fb7185", "#7c3aed"] },
  { email: "nikos@flirty.local", name: "Nikos", gender: "MAN" as Gender, seeking: ["WOMAN"] as Gender[], city: "Athens", lat: 37.9755, lng: 23.7348, dob: "1994-09-02", intention: "RELATIONSHIP" as DatingIntention, vibes: ["ADVENTUROUS", "FUNNY"] as VibeCode[], interests: ["outdoors", "music", "food"], bio: "I will get us lost in Plaka and call it a plan.", colors: ["#60a5fa", "#1e1b4b"] },
  { email: "sofia@flirty.local", name: "Sofia", gender: "WOMAN" as Gender, seeking: ["MAN", "WOMAN"] as Gender[], city: "Athens", lat: 37.99, lng: 23.73, dob: "1998-01-22", intention: "DATING" as DatingIntention, vibes: ["CREATIVE", "SOCIAL"] as VibeCode[], interests: ["art", "film", "wine"], bio: "Galleries, rooftops, and a little chaos.", colors: ["#c084fc", "#db2777"] },
  { email: "dimitris@flirty.local", name: "Dimitris", gender: "MAN" as Gender, seeking: ["WOMAN"] as Gender[], city: "Thessaloniki", lat: 40.6401, lng: 22.9444, dob: "1993-06-18", intention: "DATING" as DatingIntention, vibes: ["AMBITIOUS", "DEEP"] as VibeCode[], interests: ["books", "tech", "wine"], bio: "Serious about work. Unserious about dessert.", colors: ["#38bdf8", "#312e81"] },
  { email: "anna@flirty.local", name: "Anna", gender: "WOMAN" as Gender, seeking: ["MAN"] as Gender[], city: "Athens", lat: 37.97, lng: 23.72, dob: "1997-11-05", intention: "FIGURING_IT_OUT" as DatingIntention, vibes: ["CHILL", "FUNNY"] as VibeCode[], interests: ["cats", "film", "yoga"], bio: "Will share fries. Will not share the good pillow.", colors: ["#f9a8d4", "#6d28d9"] },
  { email: "yannis@flirty.local", name: "Yannis", gender: "MAN" as Gender, seeking: ["WOMAN"] as Gender[], city: "Athens", lat: 37.968, lng: 23.74, dob: "1995-03-30", intention: "CASUAL" as DatingIntention, vibes: ["SPONTANEOUS", "SOCIAL"] as VibeCode[], interests: ["nightlife", "fitness", "sea"], bio: "If the sea is warm, I'm already there.", colors: ["#34d399", "#1e3a8a"] },
  { email: "katerina@flirty.local", name: "Katerina", gender: "WOMAN" as Gender, seeking: ["MAN"] as Gender[], city: "Athens", lat: 37.986, lng: 23.76, dob: "1999-07-14", intention: "RELATIONSHIP" as DatingIntention, vibes: ["ROMANTIC", "CREATIVE"] as VibeCode[], interests: ["art", "books", "dogs"], bio: "Soft light, strong coffee, honest people.", colors: ["#fda4af", "#4338ca"] },
  { email: "alexandros@flirty.local", name: "Alexandros", gender: "MAN" as Gender, seeking: ["WOMAN"] as Gender[], city: "Athens", lat: 37.95, lng: 23.7, dob: "1992-12-09", intention: "MARRIAGE" as DatingIntention, vibes: ["DEEP", "AMBITIOUS"] as VibeCode[], interests: ["travel", "food", "music"], bio: "Looking for a teammate, not an audience.", colors: ["#818cf8", "#be185d"] },
  { email: "michalis@flirty.local", name: "Michalis", gender: "MAN" as Gender, seeking: ["WOMAN"] as Gender[], city: "Athens", lat: 37.978, lng: 23.736, dob: "1994-05-21", intention: "RELATIONSHIP" as DatingIntention, vibes: ["CHILL", "DEEP"] as VibeCode[], interests: ["music", "books", "sea"], bio: "Vinyl, late walks, and someone who stays.", colors: ["#38bdf8", "#1e1b4b"] },
  { email: "petros@flirty.local", name: "Petros", gender: "MAN" as Gender, seeking: ["WOMAN"] as Gender[], city: "Athens", lat: 37.981, lng: 23.721, dob: "1996-08-11", intention: "RELATIONSHIP" as DatingIntention, vibes: ["FUNNY", "SOCIAL"] as VibeCode[], interests: ["food", "film", "dogs"], bio: "I cook too much and talk with my hands.", colors: ["#fbbf24", "#7c3aed"] },
  { email: "giorgos@flirty.local", name: "Giorgos", gender: "MAN" as Gender, seeking: ["WOMAN"] as Gender[], city: "Athens", lat: 37.972, lng: 23.748, dob: "1993-02-17", intention: "DATING" as DatingIntention, vibes: ["ADVENTUROUS", "SPONTANEOUS"] as VibeCode[], interests: ["travel", "outdoors", "sea"], bio: "Weekends are for a ferry or a mountain.", colors: ["#34d399", "#0f766e"] },
];

async function portrait(file: string, name: string, c1: string, c2: string, caption = "") {
  const svg = `<svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="800" height="1000" fill="url(#g)"/>
    <circle cx="400" cy="360" r="150" fill="rgba(255,255,255,0.22)"/>
    <ellipse cx="400" cy="820" rx="230" ry="280" fill="rgba(7,4,13,0.25)"/>
    <text x="400" y="380" text-anchor="middle" font-size="64" fill="white" font-family="Arial">${name[0]}</text>
    ${caption ? `<text x="400" y="920" text-anchor="middle" font-size="28" fill="white" font-family="Arial">${caption}</text>` : ""}
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(file);
}

async function main() {
  const existingUsers = await prisma.user.count();
  if (process.env.NODE_ENV === "production" && existingUsers > 0 && process.env.FLIRTY_BOOTSTRAP !== "1") {
    console.log("Production database already has users; skipping seed.");
    return;
  }
  const passwordHash = await hash(PASSWORD, { memoryCost: 4096, timeCost: 1, algorithm: 2 });
  const adminHash = await hash(ADMIN_PASSWORD, { memoryCost: 4096, timeCost: 1, algorithm: 2 });
  const uploadRoot = path.resolve("./data/uploads/photos");
  const publicUploadRoot = path.resolve("./public/uploads/photos");
  await mkdir(uploadRoot, { recursive: true });
  await mkdir(publicUploadRoot, { recursive: true });
  await mkdir(path.resolve("./public/avatars"), { recursive: true });
  await mkdir(path.resolve("./public/icons"), { recursive: true });

  const iconSvg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="110" fill="#0c0716"/><path d="M160 190c0-40 28-72 68-72 28 0 46 14 52 40 12 44-8 84-52 128-18 18-32 32-40 40" fill="none" stroke="#ff3d8a" stroke-width="22" stroke-linecap="round"/><path d="M352 190c0-40-28-72-68-72-28 0-46 14-52 40-12 44 8 84 52 128 18 18 32 32 40 40" fill="none" stroke="#4338ca" stroke-width="22" stroke-linecap="round"/><path d="M256 292c10-18 40-16 40 6 0 22-40 44-40 44s-40-22-40-44c0-22 30-24 40-6z" fill="#ff3d8a"/></svg>`;
  await sharp(Buffer.from(iconSvg)).png().toFile("public/icons/icon-512.png");
  await sharp(Buffer.from(iconSvg)).resize(192).png().toFile("public/icons/icon-192.png");
  await sharp(Buffer.from(iconSvg)).resize(180).png().toFile("public/icons/apple-touch-icon.png");
  await sharp(Buffer.from(iconSvg)).resize(1200, 630).png().toFile("public/icons/og.png");

  const plans: Array<{ code: PlanCode; name: string; priceCents: number; description: string; highlighted: boolean }> = [
    { code: "FREE", name: "Free", priceCents: 0, description: "Start discovering", highlighted: false },
    { code: "PLUS", name: "Plus", priceCents: 799, description: "Unlimited Flirts", highlighted: false },
    { code: "GOLD", name: "Gold", priceCents: 1499, description: "See who likes you", highlighted: true },
    { code: "PLATINUM", name: "Platinum", priceCents: 2499, description: "Maximum presence", highlighted: false },
  ];
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({ where: { code: plan.code }, update: plan, create: plan });
  }
  for (const interest of INTERESTS) {
    const slug = interest[0]!;
    const label = interest[1]!;
    await prisma.interest.upsert({ where: { slug }, update: { label }, create: { slug, label } });
  }
  for (const [code, label] of VIBES) {
    await prisma.vibe.upsert({ where: { code }, update: { label }, create: { code, label } });
  }
  const flags = ["NEW_DISCOVER_UI", "SUPER_FLIRT", "VIDEO_CHAT", "VIBE_MAP", "TOP_PICKS", "BOOST", "AI_COMPATIBILITY", "GROUP_VIBES"];
  for (const key of flags) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: {},
      create: { key, enabled: ["SUPER_FLIRT", "TOP_PICKS", "BOOST"].includes(key) },
    });
  }

  const free = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "FREE" } });
  const created = [];
  for (const person of PEOPLE) {
    const key = person.name.toLowerCase();

    const user = await prisma.user.upsert({
      where: { emailNormalized: person.email },
      update: {},
      create: {
        email: person.email,
        emailNormalized: person.email,
        passwordHash,
        lastActiveAt: new Date(),
        notificationPrefs: { create: {} },
        privacy: { create: {} },
        subscription: {
          create: { planId: free.id, status: "ACTIVE", expiresAt: new Date(Date.now() + 365 * 86400e3), provider: "internal" },
        },
        profile: {
          create: {
            displayName: person.name,
            dateOfBirth: new Date(person.dob),
            gender: person.gender,
            seeking: person.seeking,
            city: person.city,
            country: "Greece",
            latitude: person.lat,
            longitude: person.lng,
            datingIntention: person.intention,
            bio: person.bio,
            prompts: [{ question: "The perfect Sunday", answer: "Sea, slow food, and no rush." }],
            lifestyle: { pace: "balanced", activity: "evenings-out", social: "small-groups" },
            onboardingStep: 14,
            onboardingCompletedAt: new Date(),
            verificationStatus: person.name === "Elena" || person.name === "Nikos" ? "VERIFIED" : "UNVERIFIED",
            qualityScore: 70,
          },
        },
        compatibility: { create: { answers: { communication: "thoughtful", activity: "evenings-out" }, communicationStyle: "thoughtful" } },
        preference: {
          create: {
            minAge: 23,
            maxAge: 40,
            maxDistanceKm: 80,
            genders: person.seeking,
            intentions: person.email === "elena@flirty.local" ? ["RELATIONSHIP", "DATING"] : [person.intention],
          },
        },
      },
      include: { profile: true },
    });
    if (user.profile) {
      const prompts = [
        { question: "The perfect Sunday", answer: person.bio },
        { question: "I go out of my way for", answer: "People who actually mean the plan." },
        { question: "You'll know it's my vibe when", answer: `${person.vibes[0]?.toLowerCase() ?? "chill"} energy, no performance.` },
      ];
      await prisma.profile.update({
        where: { id: user.profile.id },
        data: {
          bio: person.bio,
          bioEn: person.bio,
          prompts,
          heightCm: person.gender === "WOMAN" ? 167 + (person.name.length % 8) : 178 + (person.name.length % 8),
          languages: ["Greek", "English"],
          lifestyle: {
            smoking: "Never",
            drinking: "Socially",
            kids: "Open",
            pets: person.interests.includes("dogs") ? "Dog" : person.interests.includes("cats") ? "Cat" : "None",
            extras: person.vibes.includes("CHILL") ? "Night Owl" : "Travel",
          },
          availability: person.name === "Elena" ? "coffee" : person.name === "Nikos" ? "weekend" : person.name === "Yannis" ? "tonight" : "",
          dailyVibeQuestion: dailyVibeFor(),
          dailyVibeAnswer: person.bio.split(".")[0] ?? person.bio,
          dailyVibeAt: new Date(),
          verificationStatus: person.name === "Elena" || person.name === "Nikos" ? "VERIFIED" : "UNVERIFIED",
        },
      });
      await prisma.profilePhoto.deleteMany({ where: { profileId: user.profile.id } });
      const variants: Array<[string, string, string]> = [
        [person.colors[0] ?? "#ff3d8a", person.colors[1] ?? "#4338ca", "one"],
        [person.colors[1] ?? "#4338ca", "#0c0716", "two"],
        ["#ff3d8a", person.colors[0] ?? "#7c3aed", "three"],
      ];
      for (let i = 0; i < variants.length; i++) {
        const [c1, c2, caption] = variants[i]!;
        const suffix = ["a", "b", "c"][i]!;
        const largeKey = `photos/${key}-${suffix}-lg.webp`;
        await portrait(path.join(uploadRoot, `${key}-${suffix}-lg.webp`), person.name, c1, c2, caption);
        await sharp(path.join(uploadRoot, `${key}-${suffix}-lg.webp`)).resize(720, 920).toFile(path.join(uploadRoot, `${key}-${suffix}-md.webp`));
        await sharp(path.join(uploadRoot, `${key}-${suffix}-lg.webp`)).resize(240, 300).toFile(path.join(uploadRoot, `${key}-${suffix}-th.webp`));
        await Promise.all(
          [`${key}-${suffix}-lg.webp`, `${key}-${suffix}-md.webp`, `${key}-${suffix}-th.webp`].map((file) =>
            sharp(path.join(uploadRoot, file)).toFile(path.join(publicUploadRoot, file)),
          ),
        );
        await prisma.profilePhoto.create({
          data: {
            profileId: user.profile.id,
            storageKey: largeKey,
            mediumKey: `photos/${key}-${suffix}-md.webp`,
            thumbKey: `photos/${key}-${suffix}-th.webp`,
            mimeType: "image/webp",
            byteSize: 120000,
            sortOrder: i,
            isPrimary: i === 0,
            status: "APPROVED",
          },
        });
      }
      await sharp(path.join(uploadRoot, `${key}-a-lg.webp`)).jpeg().toFile(`public/avatars/${key}.jpg`);
    }
    if (person.email === "elena@flirty.local") {
      await prisma.datingPreference.updateMany({
        where: { userId: user.id },
        data: { intentions: ["RELATIONSHIP", "DATING"], minAge: 23, maxAge: 40, maxDistanceKm: 80 },
      });
    }
    const interestRows = await prisma.interest.findMany({ where: { slug: { in: person.interests } } });
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
    await prisma.userInterest.createMany({ data: interestRows.map((i) => ({ userId: user.id, interestId: i.id })) });
    const vibeRows = await prisma.vibe.findMany({ where: { code: { in: person.vibes } } });
    await prisma.userVibe.deleteMany({ where: { userId: user.id } });
    await prisma.userVibe.createMany({ data: vibeRows.map((v) => ({ userId: user.id, vibeId: v.id, intensity: 80 })) });
    created.push(user);
  }

  const admin = await prisma.user.upsert({
    where: { emailNormalized: "admin@flirty.local" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@flirty.local",
      emailNormalized: "admin@flirty.local",
      passwordHash: adminHash,
      role: "ADMIN",
      adminProfile: { create: { role: "SUPER_ADMIN" } },
      notificationPrefs: { create: {} },
      privacy: { create: {} },
      subscription: { create: { planId: free.id, status: "ACTIVE", expiresAt: new Date(Date.now() + 365 * 86400e3) } },
    },
  });

  const elena = created.find((u) => u.email === "elena@flirty.local")!;
  const nikos = created.find((u) => u.email === "nikos@flirty.local")!;
  const sofia = created.find((u) => u.email === "sofia@flirty.local")!;
  await prisma.interaction.deleteMany({ where: { actorId: elena.id, kind: "PASS" } });
  await prisma.interaction.createMany({
    data: [
      { actorId: nikos.id, targetId: elena.id, kind: "FLIRT" },
      { actorId: elena.id, targetId: nikos.id, kind: "FLIRT" },
      { actorId: sofia.id, targetId: elena.id, kind: "SUPER_LIKE" },
    ],
    skipDuplicates: true,
  });
  const [low, high] = elena.id < nikos.id ? [elena.id, nikos.id] : [nikos.id, elena.id];
  const match = await prisma.match.upsert({
    where: { id: (await prisma.match.findFirst({ where: { lowUserId: low, highUserId: high } }))?.id ?? "00000000-0000-0000-0000-000000000000" },
    update: { active: true },
    create: { lowUserId: low, highUserId: high, origin: "FLIRT" },
  }).catch(async () => prisma.match.create({ data: { lowUserId: low, highUserId: high, origin: "FLIRT" } }));
  const convo = await prisma.conversation.upsert({
    where: { matchId: match.id },
    update: {},
    create: { matchId: match.id, userAId: low, userBId: high },
  });
  await prisma.message.create({
    data: { conversationId: convo.id, senderId: nikos.id, body: "Athens looks better when you're in it.", clientId: "seed-1" },
  }).catch(() => undefined);
  await prisma.directMessage.create({
    data: { senderId: sofia.id, recipientId: elena.id, body: "Your rooftop prompt made me smile.", withSuperLike: true },
  }).catch(() => undefined);

  console.log("Seeded FLIRTY. Admin:", admin.email, "Members:", created.map((u) => u.email).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
