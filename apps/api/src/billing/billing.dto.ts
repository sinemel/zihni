import { IsEnum } from "class-validator";

// Yalnızca ücretli planlar checkout'a girebilir; ENTERPRISE satış ekibi üzerinden.
export enum PaidPlan {
  PRO = "PRO",
  EXPERT = "EXPERT",
}

export class CheckoutDto {
  @IsEnum(PaidPlan)
  plan: PaidPlan;
}
