// Ordered English -> Chinese rewrite rules for templated Atlas stat lines.
// Each match replaces the whole string; placeholders come from capture groups.
const C = {
  rare: '稀有怪物',
  magic: '魔法怪物',
  unique: '传奇怪物',
  nonUnique: '非凡怪物',
  pack: '怪物群规模',
};

export default [
  // ---------- chance to contain X ----------
  [/^Your Maps which contain Unstable Breaches have (\d+)% chance to contain an additional Unstable Breach$/,
    '你包含不稳定裂隙的地图有$1%的几率额外包含一个不稳定裂隙'],
  [/^Your Maps which contain Unstable Breaches have (\d+)% chance to contain two additional Unstable Breaches$/,
    '你包含不稳定裂隙的地图有$1%的几率额外包含两个不稳定裂隙'],
  [/^Your Maps which contain Unstable Breaches have (\d+)% chance to contain three additional Unstable Breaches$/,
    '你包含不稳定裂隙的地图有$1%的几率额外包含三个不稳定裂隙'],
  [/^Your Maps which contain Unstable Breaches have (\d+)% chance to contain ten additional Unstable Breaches$/,
    '你包含不稳定裂隙的地图有$1%的几率额外包含十个不稳定裂隙'],

  [/^Your Maps have \+(\d+)% Surpassing Chance to contain (?:an? )?(.+)$/,
    '你的地图有+$1%超凡几率包含$2'],
  [/^Your Maps have (\d+)% increased chance to contain (?:an? )?(.+)$/,
    '你的地图包含$2的几率提高$1%'],
  [/^Your Maps have \+(\d+)% chance to contain (.+)$/,
    '你的地图包含$2的几率+$1%'],
  [/^Your Maps have (\d+)% chance to contain (?:an? )?(.+) additional$/,
    '你的地图有$1%的几率额外包含$2'],
  [/^Your Maps have \+(\d+)% Surpassing Chance to be haunted by a Tormented Spirit$/,
    '你的地图有+$1%超凡几率被罪魂纠缠'],

  // ---------- increased counts / quantities in your maps ----------
  [/^(\d+)% increased number of (Rare|Magic) Monsters in your Maps$/,
    '你地图内的$2怪物数量提高$1%'],
  [/^(\d+)% increased number of Monsters in your Maps$/,
    '你地图内的怪物数量提高$1%'],
  [/^(\d+)% increased Pack Size in your Maps$/,
    '你地图内的怪物群规模提高$1%'],
  [/^(\d+)% increased Rarity of Items found in your Maps$/,
    '你地图内掉落的物品稀有度提高$1%'],
  [/^(\d+)% increased Quantity of Items found in your Maps$/,
    '你地图内掉落的物品数量提高$1%'],
  [/^(\d+)% increased Maps found in your Maps$/,
    '在你地图中找到的地图数量提高$1%'],
  [/^(\d+)% increased Divination Cards found in your Maps$/,
    '在你地图中找到的命运卡数量提高$1%'],
  [/^(\d+)% increased Gold found in your Maps$/,
    '在你地图中找到的金币数量提高$1%'],
  [/^(\d+)% increased Quantity of (.+) found in your Maps$/,
    '在你地图中找到的$2数量提高$1%'],
  [/^(\d+)% increased Quantity of (.+) dropped by (.+) in your Maps$/,
    '你地图中的$3掉落的$2数量提高$1%'],
  [/^(\d+)% increased Rarity of Items Dropped by (.+) in your Maps$/,
    '你地图中的$2掉落的物品稀有度提高$1%'],
  [/^(\d+)% increased Gold dropped by (.+) in your Maps$/,
    '你地图中的$2掉落的金币提高$1%'],
  [/^(\d+)% increased number of (.+) in your Maps$/,
    '你地图中的$2数量提高$1%'],
  [/^(\d+)% increased (.+) in your Maps$/,
    '你地图中的$2提高$1%'],
  [/^(\d+)% increased (.+) of (.+) in your Maps$/,
    '你地图中的$3的$2提高$1%'],

  // ---------- map modifier effect ----------
  [/^(\d+)% increased effect of Explicit Modifiers on your Maps$/,
    '你地图上显式词缀的效果提高$1%'],
  [/^Your Maps have \+(\d+)% chance to contain an? additional Modifier$/,
    '你的地图有+$1%的几率拥有一个额外词缀'],

  // ---------- breach ----------
  [/^Unstable Breaches in your Maps take (\d+) additional seconds to collapse after timer is filled$/,
    '你地图中的不稳定裂隙在计时器填满后额外延迟$1秒坍塌'],
  [/^Breach Hives in your Maps have (\d+)% increased chance to lead to Fortresses$/,
    '你地图中的裂隙蜂巢通往堡垒的几率提高$1%'],
  [/^Breach Hives in your Maps have (\d+) additional waves of Hiveborn Monsters$/,
    '你地图中的裂隙蜂巢额外拥有$1波蜂巢怪物'],
  [/^Breach Hives in your Maps have (\d+)% increased number of Flammable Burrows$/,
    '你地图中的裂隙蜂巢易燃地穴数量提高$1%'],
  [/^Breach Hives in your Maps have (\d+)% increased Monster count$/,
    '你地图中的裂隙蜂巢怪物数量提高$1%'],

  // ---------- abyss ----------
  [/^Abysses in your Maps spawn (\d+)% increased Monsters$/,
    '你地图中的深渊生成的怪物数量提高$1%'],
  [/^Abysses in your Maps have (\d+)% Surpassing Chance to contain an additional Pit$/,
    '你地图中的深渊有$1%超凡几率包含一个额外深渊之坑'],
  [/^Abysses in your Maps have a (\d+)% chance to contain (\d+) additional Pits$/,
    '你地图中的深渊有$1%的几率包含$2个额外深渊之坑'],
  [/^Abysses in your Maps roll number of Pits twice, keeping the highest value$/,
    '你地图中的深渊会掷两次深渊之坑数量，取较高值'],
  [/^Abyss Pits in your Maps have (\d+)% chance to spawn all Monsters as at least Magic for each prior Pit closed$/,
    '你地图中的深渊之坑每关闭一个此前的深渊之坑，就有$1%的几率使所有怪物至少为魔法怪物'],
  [/^Abyss Pits in your Maps spawn (\d+)% increased Monsters for each prior Pit closed$/,
    '你地图中的深渊之坑每关闭一个此前的深渊之坑，生成的怪物数量提高$1%'],
  [/^Non-final Abyss Pits in your Maps create an Abyssal Crystal on closing$/,
    '你地图中的非最终深渊之坑在关闭时生成一个深渊水晶'],

  // ---------- blight ----------
  [/^Blight Chests in your Maps have (\d+)% more chance to contain Blighted Maps$/,
    '你地图中的枯萎宝箱包含枯萎地图的几率提高$1%'],
  [/^Lanes of Blight Encounters in your Maps have (\d+)% chance for an additional Reward Chest$/,
    '你地图中枯萎遭遇的通道有$1%的几率额外拥有一个奖励宝箱'],
  [/^Varieties of Items contained in (\d+) Blight Chests in your Maps are Lucky$/,
    '你地图中$1个枯萎宝箱内物品的种类为幸运'],
  [/^Blight Monsters in your Maps take (\d+)% increased Damage$/,
    '你地图中的枯萎怪物受到的伤害提高$1%'],
  [/^Blight Encounters in your Maps spawn (\d+)% increased (.+) Monsters$/,
    '你地图中的枯萎遭遇生成的$2怪物数量提高$1%'],

  // ---------- shrines ----------
  [/^Shrines in your Maps have (\d+)% chance to be guarded by an additional Pack of Monsters$/,
    '你地图中的神殿有$1%的几率由额外一群怪物守卫'],
  [/^(\d+)% increased effect of Shrine Buffs on players granted by Shrines in your Maps$/,
    '你地图中神殿给予玩家的神殿增益效果提高$1%'],
  [/^(\d+)% increased duration of Shrine Buffs on players granted by Shrines in your Maps$/,
    '你地图中神殿给予玩家的神殿增益持续时间延长$1%'],

  // ---------- torment ----------
  [/^Tormented Spirits in your Maps have (\d+)% increased Duration$/,
    '你地图中的罪魂持续时间延长$1%'],

  // ---------- betrayal ----------
  [/^Immortal Syndicate Members in your Maps have (\d+)% chance to drop an additional Veiled Item$/,
    '你地图中的不朽辛迪加成员有$1%的几率额外掉落一件隐匿物品'],
  [/^Immortal Syndicate Members in your Maps have (\d+)% increased chance to be accompanied by reinforcements$/,
    '你地图中的不朽辛迪加成员由增援陪同的几率提高$1%'],

  // ---------- sacred flora / fauna ----------
  [/^Sacred Fauna in your Maps grant (\d+)% increased Experience$/,
    '你地图中的圣兽提供的经验提高$1%'],
  [/^Sacred Flora in your Maps spreads Wildwood Wisps to (\d+)% increased Monsters$/,
    '你地图中的圣花向$1%更多怪物散播荒野鬼火'],
  [/^Lifeforce dropped by Sacred Fauna in your Maps has (\d+)% chance to be Duplicated$/,
    '你地图中圣兽掉落的命能有$1%的几率被复制'],

  // ---------- mercenaries ----------
  [/^Your Maps have \+(\d+)% chance to be inhabited by a Mercenary$/,
    '你的地图有+$1%的几率有佣兵出没'],
  [/^Atlas Anomalies manifest on completing Shaped Regions instead of on Map Completion$/,
    '舆图异象改为在完成塑造之域时显现，而不是在完成地图时显现'],
  [/^Atlas Anomalies can manifest from any Quadrant$/,
    '舆图异象可以从任一象限显现'],

  // ---------- eldritch altars ----------
  [/^Eldritch Altars Influenced by The Searing Exarch have (\d+)% chance to have an additional Upside$/,
    '受焚界者影响的古灵祭坛有$1%的几率拥有一个额外正面效果'],
  [/^Eldritch Altars Influenced by The Searing Exarch which have an additional Upside have (\d+)% increased Effect of Downsides$/,
    '受焚界者影响且拥有额外正面效果的古灵祭坛，其负面效果提高$1%'],
  [/^Eldritch Altars Influenced by The Eater of Worlds have an additional Downside$/,
    '受灭世者影响的古灵祭坛额外拥有一个负面效果'],
  [/^Eldritch Altars Influenced by The Eater of Worlds have (\d+)% increased Effect of Upsides$/,
    '受灭世者影响的古灵祭坛，其正面效果提高$1%'],

  // ---------- legion ----------
  [/^(\d+)% increased chance for Legion Encounters in your Maps to include a General$/,
    '你地图中的军团遭遇包含将领的几率提高$1%'],

  // ---------- misc generic ----------
  [/^(\d+)% increased Rarity of Items from (.+) in your Maps per (\d+)% Map Pack Size$/,
    '你地图中的$2每$3%地图怪物群规模，物品稀有度提高$1%'],
  [/^(\d+)% increased effect of (.+) on your Maps$/,
    '你地图上$2的效果提高$1%'],
  [/^(\d+)% increased chance to encounter certain (.+)$/,
    '遭遇特定$2的几率提高$1%'],
  [/^Mercenaries found in your Maps are accompanied by varying Wild Mercenaries$/,
    '在你地图中找到的佣兵由不同的野生佣兵陪同'],
];
